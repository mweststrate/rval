import { runInNewContext } from "vm";

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

interface RValContext {
  isUpdating: boolean
  pending: Thunk[],
  currentlyComputingStack: Set<ObservableAdministration>[]
  currentlyComputing: Set<ObservableAdministration>
  isRunningReactions: boolean
  runPendingObservers()
}

interface ObservableAdministration {
  addListener(observer: Thunk)
  removeListener(observer: Thunk)
  get(): any
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
    currentlyComputingStack: [],
    get currentlyComputing() {
      return this.currentlyComputingStack[this.currentlyComputingStack.length - 1]
    },
    isRunningReactions: false,
    runPendingObservers
  }

  function runAfterBatch(t: Thunk) {
    context.pending.push(t)
    runPendingObservers();
  }

  function val<T, S>(initial: S, preProcessor = defaultPreProcessor): Val<T, S> {
    return new ObservableValue(context, api, initial, preProcessor).get as any
  }

  function drv<T>(derivation: () => T): Drv<T> {
    return new Computed<T>(context, derivation).get as any
  }


  function effect<T>(fn: () => T, onInvalidate: (onChanged: Thunk, pull: () => T) => void): Thunk {
    const computed = new Computed(context, fn)
    let scheduled = false
    
    function didChange() {
      return computed.someDependencyHasChanged()
    }

    function pull() {
      scheduled = false
      return computed.get()
    }

    const noopObserver = {
      markDirty: () => {
        scheduled = true
        onInvalidate(didChange, pull)
      }
    }
    
    computed.addListener(noopObserver.markDirty)
    noopObserver.markDirty()
    return once(() => {
      computed.removeListener(noopObserver.markDirty)
    })
  }

  function sub<T>(
    src: Observable<T>,
    listener: Listener<T>,
    options?: SubscribeOptions
  ): Disposer {
    // TODO: support options
    // - scheduler
    // - fire immediately
    const scheduler = runAfterBatch
    let lastSeen: T | undefined = undefined
    let firstRun = true
    let scheduled = false
    const noopObserver = { // TODO: doesn't need to be an object anymore!
      markDirty: () => {
        if (!scheduled) {
          scheduled = true
          scheduler(() => noopObserver.runIfChanged())
        }
      },
      runIfChanged() {
          // Not cancelled yet?
          if (!computed.listeners.length) return // TODO: not nice!
          scheduled = false
          // if (!firstRun && !computed.someDependencyHasChanged())
          //   return
          computed.track()
          const p = computed.value
          if (firstRun) {
            firstRun = false
            lastSeen = p
          }
          if (p !== lastSeen) {
            lastSeen = p
            listener(p)
          }
      }
    }
    // TODO: pretty sure we can make this wrapping Computed obsolete?
    const computed = isDrv(src) ? src[$RVal] : new Computed(context, src)
    computed.addListener(noopObserver.markDirty)
    scheduler(() => noopObserver.runIfChanged())
    return once(() => {
      computed.removeListener(noopObserver.markDirty)
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
        context.pending.splice(0).forEach(s => s()) // TODO: extract run
      }
      context.isRunningReactions = false
    }
  }

  // prettier-ignore
  const api = { val, drv, sub, batch, batched, effect }
  return api
}

const defaultPreProcessor = value => value
const defaultContextMembers = rval()

class ObservableValue<T> implements ObservableAdministration {
  listeners: Thunk[] = []
  value: T
  constructor(private context: RValContext, public api: RValFactories, state: T, private preProcessor) {
    this.get = this.get.bind(this)
    hiddenProp(this.get, $RVal, this)
    this.value = deepfreeze(preProcessor(state, undefined, this.api)) // TODO: make freeze an option
  }
  addListener(listener) {
    // TODO: use class
    this.listeners.push(listener)
  }
  removeListener(listener) {  // TODO: rename to listener
    removeCallback(this.listeners, listener)
  }
  get(newValue?: T) {
    switch (arguments.length) {
      case 0:
        registerRead(this.context, this)
        return this.value
      case 1:
      // prettier-ignore
        if (this.context.currentlyComputing) throw new Error('derivations cannot have side effects and update values')
        // if (!isUpdating)
        //   throw new Error("val can only be updated within an 'update' context") // TODO: make ok, but optionally support / enforce batching
        newValue = this.preProcessor(newValue, this.value, this.api)
        if (newValue !== this.value) {
          this.value = deepfreeze(newValue) // TODO: make freeze an option
          const observers = this.listeners.slice() // TODO: optimization: slice don't seem necessary anymore
          run(observers)
        }
        break
      default:
        throw new Error('val expects 0 or 1 arguments')
    }
  }
}

class Computed<T = any> implements ObservableAdministration {
  listeners: Thunk[] = []
  inputValues: any[] | undefined = undefined
  observing!: Set<ObservableAdministration>
  state = NOT_TRACKING
  dirtyCount = 0
  value: T = undefined!
  constructor(private context: RValContext, public derivation: () => T) {
    this.get = this.get.bind(this)
    hiddenProp(this.get, $RVal, this)
  }
  markDirty = () => {
    if (++this.dirtyCount === 1) {
      this.state = STALE
      run(this.listeners)
    }
  }
  addListener(observer) {
    this.listeners.push(observer)
  }
  removeListener(observer) {
    removeCallback(this.listeners, observer)
    if (!this.listeners.length) {
      this.observing.forEach(o => o.removeListener(this.markDirty))
      this.value = undefined!
      this.state = NOT_TRACKING
      this.inputValues = undefined
    }
  }
  registerDependency(sub: ObservableAdministration) {
    this.observing.add(sub)
  }
  someDependencyHasChanged() {
    return this.state === NOT_TRACKING || inputSetHasChanged(this.observing, this.inputValues)
  }
  track() {
    this.dirtyCount = 0
    this.state = UP_TO_DATE
    if (!this.someDependencyHasChanged())
      return
    const oldObserving = this.observing
    const [newValue, newObserving] = track(this.context, this.derivation)
    this.value = newValue
    this.observing = newObserving
    this.inputValues = recordInputSet(newObserving)
    registerDependencies(this.markDirty, oldObserving, newObserving)
  }
  get() {
    // console.log("GET - "+ this.derivation.toString())
    // something being computed? setup tracking
    registerRead(this.context, this)
    // yay, we are up to date!
    if (this.state === UP_TO_DATE) return this.value
    // nope, we are not, and no one is observing either
    if (!this.context.currentlyComputing && !this.listeners.length)
      return this.derivation()
    // maybe scheduled, definitely tracking, value is needed, track now!
    this.track()
    return this.value
  }
}

type DependencySet = (ObservableAdministration | any)[]

function track<R>(context: RValContext, fn: () => R): [R, Set<ObservableAdministration>] {
  const observing = new Set()
  context.currentlyComputingStack.push(observing)
  const res = fn()
  context.currentlyComputingStack.pop()
  return [res, observing]
}

function registerDependencies(listener: Thunk, oldDeps: Set<ObservableAdministration>, newDeps: Set<ObservableAdministration>) {
  // Optimize: 
  if (!oldDeps) {
    newDeps.forEach(d => d.addListener(listener))
  } else {
    newDeps.forEach(o => {
      if (!oldDeps.has(o)) o.addListener(listener)
    })
    oldDeps.forEach(o => {
      if (!newDeps.has(o)) o.removeListener(listener)
    })
  }
}

function registerRead(context: RValContext, observable: ObservableAdministration) {
  // optimize: same last touched by optimization as MobX
  if (context.currentlyComputing) context.currentlyComputing.add(observable)
}

function recordInputSet(deps: Set<ObservableAdministration>): any[] {
  // optimize: write more efficiently
  return Array.from(deps).map(currentValue)
}

function inputSetHasChanged(deps: Set<ObservableAdministration>, inputs?: any[]) {
  return !deps || !inputs || !Array.from(deps.values()).every((o, idx) => o.get() === inputs[idx])
}

function currentValue(dep: ObservableAdministration): any {
  // Returns the current, last known (computed) value of a dep
  // Regardless whether that is stale or not 
  return (dep as any).value
}

function run(fns: Thunk[]): void {
  fns.forEach(f => f()) // optimize
}

function removeCallback(fns: Thunk[], fn: Thunk) {
  fns.splice(fns.indexOf(fn), 1) // TODO: defensive index check?
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
    // N.B.: quoting is important, to prevent minification issue. See keep_quoted option!
    "configurable": true,
    "enumerable": false,
    "writable": false,
    "value": value
  })
}

export const val = defaultContextMembers.val
export const drv = defaultContextMembers.drv
export const sub = defaultContextMembers.sub
export const batch = defaultContextMembers.batch
export const batched = defaultContextMembers.batched
export const effect = defaultContextMembers.effect

