import once from 'once'
import deepFreeze from 'deepfreeze'

export type Listener<T = any> = (value: T) => void

export type Thunk = () => void

export type Disposer = Thunk

export const $Merri = Symbol.for('$Merri') // TODO: rename

export interface Observable<T = unknown> {
  (): T
}

export interface Drv<T> extends Observable<T> {}

export interface Val<T> extends Observable<T> {
  (newValue: T): void
}

interface Observer {
  markDirty()
  markReady(changed: boolean)
  run()
}

interface ObservableAdministration {
  addObserver(observer: Observer)
  removeObserver(observer: Observer)
}

export interface SubscribeOptions {
  fireImmediately?: boolean
  scheduler?: (run: Thunk) => void
}

enum DerivationState { NOT_TRACKING, STALE, UP_TO_DATE }

function rval() {
  let isUpdating = false
  const pending: Observer[] = []
  let currentlyComputing: Computed | undefined = undefined
  let isRunningreactions = false

  // TODO: eliminate classes for better minification
  // TODO: make it possible to create a reativity context, for libs and such,
  // and provide a default context as well

  class ObservableValue<T> implements ObservableAdministration {
    observers: Observer[] = []
    state: T
    constructor(state: T) {
      this.state = deepFreeze(state) // TODO: make freeze an option
      this.get = this.get.bind(this)
      this.get[$Merri] = this
    }
    addObserver(observer) {
      // TODO: use class
      this.observers.push(observer)
    }
    removeObserver(observer) {
      this.observers.splice(this.observers.indexOf(observer), 1)
    }
    get(newValue?: T) {
      switch (arguments.length) {
        case 0:
          if (currentlyComputing)
            // optimize: same last touched by optimization as MobX
            currentlyComputing.registerDependency(this)
          return this.state
        case 1:
          if (currentlyComputing)
            throw new Error("derivations cannot have side effects and update values")
          // if (!isUpdating)
          //   throw new Error("val can only be updated within an 'update' context") // TODO: make ok, but optionally support / enforce batching
          if (newValue !== this.state) {
            // TODO: run preprocessor(newValue, oldValue) here, and use it for comparison, or model instantiation!
            deepFreeze(newValue) // TODO: make freeze an option
            this.state = newValue!
            const observers = this.observers.slice()
            observers.forEach(s => s.markDirty())
            observers.forEach(s => s.markReady(true))
          }
          break
        default:
          throw new Error('val expects 0 or 1 arguments')
      }
    }
  }

  class Computed<T = any> implements ObservableAdministration, Observer {
    observers: Observer[] = []
    observing: Set<ObservableAdministration> = new Set()
    state: DerivationState = DerivationState.NOT_TRACKING
    scheduled = false
    dirtyCount = 0
    changedCount = 0
    value: T = undefined!
    constructor(public derivation: () => T) {
      const self = this
      this.get = this.get.bind(this)
      this.get[$Merri] = this
    }
    markDirty() {
      if (this.scheduled) return
      if (++this.dirtyCount === 1) {
        this.state = DerivationState.STALE
        this.observers.forEach(o => o.markDirty())
      }
    }
    markReady(changed) {
      if (this.scheduled) return
      if (changed) this.changedCount++
      if (--this.dirtyCount === 0) {
        if (this.changedCount) this.schedule()
        else this.state = DerivationState.UP_TO_DATE
      }
    }
    addObserver(observer) {
      this.observers.push(observer)
      if (this.observers.length === 1 && this.state !== DerivationState.UP_TO_DATE) {
        this.track()
      }
    }
    removeObserver(observer) {
      this.observers.splice(this.observers.indexOf(observer), 1)
      if (!this.observers.length) {
        this.observing.forEach(o => o.removeObserver(this))
        this.value = undefined!
        this.state = DerivationState.NOT_TRACKING
      }
    }
    registerDependency(sub: ObservableAdministration) {
      this.observing.add(sub)
    }
    schedule() {
      if (!this.scheduled) {
        this.scheduled = true
        // // TODO: run scheduler here!
        // options:
        // - custom scheduler
        // - lazy (propagate 'changed') on dirty for mobx like semantics
        pending.push(this)
        runPendingObservers()
      }
    }
    run() {
      if (!currentlyComputing) {
        // already eagerly evaluated, before scheduler got to run this derivation
        if (!this.scheduled ) return
        // all observers have gone in the mean time...
        if (!this.observers.length) return
      }
      const prevValue = this.value
      this.track()
      const changed = this.value !== prevValue // TODO: support custom - compare
      // propagate the change
      this.observers.forEach(o => o.markReady(changed)) // TODO fix: set of observers might have changed in mean time
    }
    track() {
      this.changedCount = 0
      this.scheduled = false
      const oldObserving = this.observing
      this.observing = new Set()
      const prevComputing = currentlyComputing
      currentlyComputing = this
      this.value = this.derivation() // TODO error handling.
      this.state = DerivationState.UP_TO_DATE
      // TODO: optimize
      this.observing.forEach(o => {
        if (!oldObserving.has(o)) o.addObserver(this)
      })
      oldObserving.forEach(o => {
        if (!this.observing.has(o)) o.removeObserver(this)
      })
      currentlyComputing = prevComputing
    }
    get() {
      // something being computed? setup tracking
      if (currentlyComputing) currentlyComputing.registerDependency(this)
      // yay, we are up to date!
      if (this.state === DerivationState.UP_TO_DATE) return this.value
      // nope, we are not, and no one is observing either
      if (!currentlyComputing && !this.observers.length) return this.derivation()
      // maybe scheduled, definitely tracking, value is needed, track now!
      this.run()
      return this.value
    }
  }

  function val<T>(initial: T): Val<T> {
    return new ObservableValue(initial).get as any
  }

  function sub<T>(
    src: Observable<T>,
    listener: Listener<T>,
    options?: SubscribeOptions
  ): Disposer {
    // TODO: support options
    // - scheduler
    // - fire immediately
    const noopObserver = {
      markDirty() {},
      markReady(changed) {
        // assumption, markReady is always triggered exactly once, as it is subscribing to only one
        if (changed) listener(computed.get())
      }
    }
    const computed = new Computed(src)
    computed.addObserver(noopObserver)
    return once(() => {
      computed.removeObserver(noopObserver)
    })
  }

  function drv<T>(derivation: () => T): Drv<T> {
    return new Computed<T>(derivation).get as any
  }

  // TODO: autowrap with update and warn?
  function batch<R>(updater: () => R) {
    let prevUpdating = isUpdating
    isUpdating = true
    try {
      return updater()
    } finally {
      isUpdating = prevUpdating
      if (!isUpdating) {
        runPendingObservers()
      }
    }
  }

  function batched<T extends Function>(fn: T): T {
    return (function updater(this: any) {
      const self = this
      batch(() => fn.apply(self, arguments))
    } as any) as T
  }


  function runPendingObservers() {
    if (!isUpdating && !isRunningreactions) {
      isRunningreactions = true
      while (pending.length) {
        // N.B. errors here cause other pending subscriptions to be aborted!
        // TODO: cancel that subscription instead and continue (try catch in run())
        pending.splice(0).forEach(s => s.run())
      }
      isRunningreactions = false
    }
  }

  return {
    val, drv, sub, batch, batched
  }
}

const defaultContextMembers = rval()

export const val = defaultContextMembers.val;
export const drv = defaultContextMembers.drv;
export const sub = defaultContextMembers.sub;
export const batch = defaultContextMembers.batch;
export const batched = defaultContextMembers.batched;

export function toJS(value) {
  // convert, recursively, all own enumerable, primitive + vals values
}
