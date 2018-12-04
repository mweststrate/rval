export type Listener<T = any> = (value: T) => void

export type Thunk = () => void

export type Disposer = Thunk

export const $RVal = typeof Symbol === "undefined" ? "$RVal" : Symbol.for('$RVal')

export interface Observable<T = unknown> {
  (): T
}

export interface Drv<T = unknown> extends Observable<T> {}

export interface Val<T = unknown, S = T> extends Observable<T> {
  (newValue: T | S): void
}

interface Observer {
  markDirty()
  markReady(changed: boolean)
  run()
}

interface RValContext {
  isUpdating: boolean
  pending: Observer[],
  currentlyComputing: Computed | undefined
  isRunningReactions: boolean
  runPendingObservers()
}

interface ObservableAdministration {
  addObserver(observer: Observer)
  removeObserver(observer: Observer)
}

// TODO: swap types of S, T, infer
// also for Val
export type PreProcessor<T = unknown, S = T> = (newValue: T | S, baseValue?: T, api?: RValFactories) => T

export interface RValFactories {
  val<T, S>(initial: S, preProcessor: PreProcessor<T, S>): Val<T, S>
  val<T>(initial: T): Val<T, T>
  drv<T>(derivation: () => T): Drv<T>
  sub<T>(
    src: Observable<T>,
    listener: Listener<T>,
    options?: SubscribeOptions
  ): Disposer
  batch<R>(updater: () => R): R
  batched<T extends Function>(fn: T): T
}

export interface SubscribeOptions {
  fireImmediately?: boolean
  scheduler?: (run: Thunk) => void
}

const NOT_TRACKING = 0
const STALE = 1
const UP_TO_DATE = 2

export function rval(base?: Val<any, any>): RValFactories {
  if (arguments.length) {
    if (!isVal(base))
      throw new Error("Expected val as first argument to rval")
    return (base[$RVal] as ObservableValue<any>).api
  }
  const context: RValContext = {
    isUpdating : false,
    pending: [],
    currentlyComputing: undefined,
    isRunningReactions: false,
    runPendingObservers
  }

  function val<T, S>(initial: S, preProcessor = defaultPreProcessor): Val<T, S> {
    return new ObservableValue(context, api, initial, preProcessor).get as any
  }

  function drv<T>(derivation: () => T): Drv<T> {
    return new Computed<T>(context, derivation).get as any
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
      },
    }
    const computed = new Computed(context, src)
    computed.addObserver(noopObserver)
    return once(() => {
      computed.removeObserver(noopObserver)
    })
  }


  // TODO: autowrap with update and warn?
  function batch<R>(updater: () => R): R {
    let prevUpdating = context.isUpdating
    context.isUpdating = true
    try {
      return updater()
    } finally {
      context.isUpdating = prevUpdating
      if (!context.isUpdating) {
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
    if (!context.isUpdating && !context.isRunningReactions) {
      context.isRunningReactions = true
      while (context.pending.length) {
        // N.B. errors here cause other pending subscriptions to be aborted!
        // TODO: cancel that subscription instead and continue (try catch in run())
        context.pending.splice(0).forEach(s => s.run())
      }
      context.isRunningReactions = false
    }
  }

  // prettier-ignore
  const api = { val, drv, sub, batch, batched }
  return api
}

const defaultPreProcessor = v => v
const defaultContextMembers = rval()

class ObservableValue<T> implements ObservableAdministration {
  observers: Observer[] = []
  state: T
  constructor(private context: RValContext, public api: RValFactories, state: T, private preProcessor) {
    this.get = this.get.bind(this)
    hiddenProp(this.get, $RVal, this)
    this.state = deepfreeze(preProcessor(state, undefined, this.api)) // TODO: make freeze an option
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
        if (this.context.currentlyComputing)
          // optimize: same last touched by optimization as MobX
          this.context.currentlyComputing.registerDependency(this)
        return this.state
      case 1:
      // prettier-ignore
        if (this.context.currentlyComputing) throw new Error('derivations cannot have side effects and update values')
        // if (!isUpdating)
        //   throw new Error("val can only be updated within an 'update' context") // TODO: make ok, but optionally support / enforce batching
        newValue = this.preProcessor(newValue, this.state, this.api)
        if (newValue !== this.state) {
          this.state = deepfreeze(newValue) // TODO: make freeze an option
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
  state = NOT_TRACKING
  scheduled = false
  dirtyCount = 0
  changedCount = 0
  value: T = undefined!
  constructor(private context: RValContext, public derivation: () => T) {
    this.get = this.get.bind(this)
    hiddenProp(this.get, $RVal, this)
  }
  markDirty() {
    if (this.scheduled) return
    if (++this.dirtyCount === 1) {
      this.state = STALE
      this.observers.forEach(o => o.markDirty())
    }
  }
  markReady(changed) {
    if (this.scheduled) return
    if (changed) this.changedCount++
    if (--this.dirtyCount === 0) {
      if (this.changedCount) this.schedule()
      else this.state = UP_TO_DATE
    }
  }
  addObserver(observer) {
    this.observers.push(observer)
    if (this.observers.length === 1 && this.state !== UP_TO_DATE) {
      this.track()
    }
  }
  removeObserver(observer) {
    this.observers.splice(this.observers.indexOf(observer), 1)
    if (!this.observers.length) {
      this.observing.forEach(o => o.removeObserver(this))
      this.value = undefined!
      this.state = NOT_TRACKING
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
      this.context.pending.push(this)
      this.context.runPendingObservers()
    }
  }
  run() {
    if (!this.context.currentlyComputing) {
      // already eagerly evaluated, before scheduler got to run this derivation
      if (!this.scheduled) return
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
    const prevComputing = this.context.currentlyComputing
    this.context.currentlyComputing = this
    this.value = this.derivation() // TODO error handling.
    this.state = UP_TO_DATE
    // TODO: optimize
    this.observing.forEach(o => {
      if (!oldObserving.has(o)) o.addObserver(this)
    })
    oldObserving.forEach(o => {
      if (!this.observing.has(o)) o.removeObserver(this)
    })
    this.context.currentlyComputing = prevComputing
  }
  get() {
    // something being computed? setup tracking
    if (this.context.currentlyComputing) this.context.currentlyComputing.registerDependency(this)
    // yay, we are up to date!
    if (this.state === UP_TO_DATE) return this.value
    // nope, we are not, and no one is observing either
    if (!this.context.currentlyComputing && !this.observers.length)
      return this.derivation()
    // maybe scheduled, definitely tracking, value is needed, track now!
    this.run()
    return this.value
  }
}

export function toJS(value) {
  // convert, recursively, all own enumerable, primitive + vals values
}

export function isVal(value: any): value is Val {
  return typeof value === "function" && value[$RVal] instanceof ObservableValue
}

export function isDrv(value: any): value is Drv {
  return typeof value === "function" && value[$RVal] instanceof Computed
}

function once<T extends Function>(fn: T): T {
  // based on 'once' package, but made smaller
  var f: any = function(this: any) {
    if (f.called) return f.value
    f.called = true
    return (f.value = fn.apply(this, arguments))
  }
  f.called = false
  return f
}

export function deepfreeze(o) {
  // based on 'deepfreeze' package, but copied here to simplify build setup :-/
  if (o === Object(o)) {
    Object.isFrozen(o) || Object.freeze(o)
    Object.getOwnPropertyNames(o).forEach(function(prop) {
      prop === 'constructor' || deepfreeze(o[prop])
    })
  }
  return o
}

function hiddenProp(target, key, value) {
  Object.defineProperty(target, key, {
    configurable: true,
    enumerable: false,
    writable: false,
    value
  })
}

export const val = defaultContextMembers.val
export const drv = defaultContextMembers.drv
export const sub = defaultContextMembers.sub
export const batch = defaultContextMembers.batch
export const batched = defaultContextMembers.batched
