export type SubListener<T = any> = (value: T, prevValue?: T) => void

export type Thunk = () => void

export type Disposer = Thunk

// Exposed, this might be useful for third part reflection based (dev) tools
export const $RVal = typeof Symbol === "undefined" ? "$RVal" : Symbol.for('$RVal')

export interface Observable<T = unknown> {
  (): T
}

export interface Drv<T = unknown, S = T> extends Observable<T> {
  (newValue: T | S): void
}

export interface Val<T = unknown, S = T> extends Observable<T> {
  (updater: (current: T) => T | S): void
  (newValue: T | S): void
}

interface RValContext {
  config: RValConfig
  isUpdating: boolean
  pending: Thunk[],
  currentlyComputingStack: Set<ObservableAdministration>[]
  currentlyComputing: Set<ObservableAdministration>
  isRunningReactions: boolean
  runPendingObservers()
}

export interface RValConfig {
  autoFreeze: boolean
}

interface ObservableAdministration {
  addListener(observer: Thunk)
  removeListener(observer: Thunk)
  get(): any
}

export type PreProcessor<T = unknown, S = T> = (newValue: T | S, baseValue?: T, api?: RValInstance) => T

export interface RValInstance {
  val<T>(initial: T): Val<T, T>
  val<T, S=T>(initial: S, preProcessor?: PreProcessor<T, S> | (PreProcessor<T, any>[])): Val<T, S>
  drv<T, S=T>(derivation: () => T, setter?: (value: S) => void): Drv<T>
  sub<T>(
    listener: SubListener<T>,
    options?: SubscribeOptions
  ): (src: Observable<T>) => Disposer
  sub<T>(
    src: Observable<T>,
    listener: SubListener<T>,
    options?: SubscribeOptions
  ): Disposer
  effect<T>(fn: () => T, onInvalidate: (onChanged: () => boolean, pull: () => T) => void): Thunk
  act<T extends Function>(fn: T): T
  configure(config: Partial<RValConfig>): void
}

export interface SubscribeOptions {
  fireImmediately?: boolean
}

const NOT_TRACKING = 0
const STALE = 1
const UP_TO_DATE = 2

export function rval(base?: Val<any, any>): RValInstance {
  if (arguments.length) {
    if (!isVal(base) && !isDrv(base))
      throw new Error("Expected val as first argument to rval")
    return (base[$RVal] as any).api
  }

  const context: RValContext = {
    config: {
      autoFreeze: true 
    },
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
  }

  function val(initial, preProcessor: any = defaultPreProcessor): Val<any, any> {
    return new ObservableValue(context, api, initial, preProcessor).get as any
  }

  function drv<T>(derivation: () => T, setter: (value) => void): Drv<T> {
    return new Computed<T>(context, api, derivation, setter).get as any
  }

  function effect<T>(fn: () => T, onInvalidate: (didChange: () => boolean, pull: () => T) => void): Thunk {
    const computed = isDrv(fn) ? fn[$RVal] : new Computed(context, api, fn)
    let scheduled = true
    let disposed = false
    let lastSeen: any = {} // definitely not pointer equal to something else
    
    function didChange() {
      if (disposed) return false
      // the right hand of the OR is an easy in case the computed was evaluated early in a batch, but the effect didn't run, 
      // see test 'drv is not re-evaluating if triggered eagerly'
      const changed = computed.someDependencyHasChanged() || lastSeen !== computed.get()
      if (!changed) {
        scheduled = false // no pull is expected
      }
      return changed
    }
    function pull() {
      if (disposed) {
        throw new Error("[rval] pulling from already disposed effect")
      }
      scheduled = false
      return lastSeen = computed.get()
    }
    function onDirty () {
      if (scheduled || disposed) return
      scheduled = true
      runAfterBatch(() => onInvalidate(didChange, pull))
    }
    
    computed.addListener(onDirty)
    onInvalidate(didChange, pull)
    return _once(() => {
      disposed = true
      computed.removeListener(onDirty)
    })
  }

  function sub(
    src,
    listener?,
    options?
  ) {
    if (arguments.length === 1 || typeof arguments[1] !== "function") {
      // curried invocation
      return source => sub(source, src /* the listener actually */, listener /* the options actually */)
    }

    let lastSeen: any = undefined
    let firstRun = true
    return effect(src, (didChange, pull) => {
      if (didChange()) {
        const v = pull()
        if (firstRun ? (options && options.fireImmediately) : v !== lastSeen) 
          listener(v, lastSeen)
        lastSeen = v
        firstRun = false
      }
    })
  }

  function act<T extends Function>(fn: T): T {
    return function act(this: any) {
      if (context.isUpdating)
        return fn.apply(this, arguments)
      try {
        context.isUpdating = true
        return fn.apply(this, arguments)
      } finally {
        context.isUpdating = false
        runPendingObservers()
      }
    } as any
  }

  function runPendingObservers() {
    if (!context.isUpdating && !context.isRunningReactions) {
      context.isRunningReactions = true
      while (context.pending.length) {
        // N.B. errors here cause other pending subscriptions to be aborted!
        context.pending.splice(0).forEach(runFn)
      }
      context.isRunningReactions = false
    }
  }

  function configure(config: Partial<RValConfig>) {
    Object.assign(context.config, config)
  }

  // prettier-ignore
  const api = { val, drv, sub, act, effect, configure }
  return api
}

const globalProp = "defaultRValInstance" 
const defaultPreProcessor = value => value
export const defaultInstance: RValInstance = global[globalProp] = (() => {
  const globalInstance = global[globalProp]
  if (globalInstance) {
    console.warn("Note: RVal is included in this project twice") // TODO: which is fine, unless this one is used..
    return globalInstance
  }
  return rval()
})()

class ObservableValue<T> implements ObservableAdministration {
  listeners: Thunk[] = []
  value: T
  get: () => T
  preProcessor: PreProcessor
  constructor(private context: RValContext, public api: RValInstance, state: T, preProcessor) {
    this.get = this.getSet.bind(this) as any
    this.preProcessor = normalizePreProcessor(preProcessor)
    hiddenProp(this.get, $RVal, this)
    this.value = this.freeze(this.preProcessor(state, undefined, this.api))
  }
  addListener(listener) {
    this.listeners.push(listener)
  }
  removeListener(listener) {
    removeCallback(this.listeners, listener)
  }
  getSet(newValue?: T) {
    switch (arguments.length) {
      case 0:
        registerRead(this.context, this)
        return this.value
      case 1:
        // prettier-ignore
        // TODO: re-enable? if (this.context.currentlyComputing) throw new Error('derivations cannot have side effects and update values')
        if(typeof newValue === "function") newValue = newValue(this.value)
        newValue = this.preProcessor(newValue, this.value, this.api) as T
        if (newValue !== this.value) {
          this.value = this.freeze(newValue!)
          this.notifyObservers()
        }
        break
      default:
        throw new Error('val expects 0 or 1 arguments')
    }
  }
  // optimization: could factor out this closure
  notifyObservers = this.api.act(() => {
      runAll(this.listeners)
  })
  freeze(v) {
    if (this.context.config.autoFreeze && (Array.isArray(v) || _isPlainObject(v))) _deepfreeze(v)
    return v
  }
}

class Computed<T = any> implements ObservableAdministration {
  listeners: Thunk[] = []
  inputValues: any[] | undefined = undefined
  observing: Set<ObservableAdministration> = new Set()
  state = NOT_TRACKING
  dirtyCount = 0
  value: T = undefined!
  get: () => T
  setter?: (value) => void
  constructor(private context: RValContext, public api: RValInstance, public derivation: () => T, setter?: (value) => void) {
    this.get = this.getSet.bind(this) as any
    if (setter) this.setter = api.act(setter)
    hiddenProp(this.get, $RVal, this)
  }
  markDirty = () => {
    if (++this.dirtyCount === 1) {
      this.state = STALE
      runAll(this.listeners)
    }
  }
  addListener(observer) {
    this.listeners.push(observer)
  }
  removeListener(observer) {
    removeCallback(this.listeners, observer)
    if (!this.listeners.length) {
      this.observing.forEach(o => o.removeListener(this.markDirty))
      this.observing = new Set()
      this.value = undefined!
      this.state = NOT_TRACKING
      this.inputValues = undefined
    }
  }
  registerDependency(sub: ObservableAdministration) {
    this.observing.add(sub)
  }
  someDependencyHasChanged() {
    switch(this.state) {
      case NOT_TRACKING: return true
      case UP_TO_DATE: return false
      case STALE: 
        if (!inputSetHasChanged(this.observing, this.inputValues)) {
          this.dirtyCount = 0
          this.state = UP_TO_DATE
          return false;
        }
      }
      return true;
  }
  track() {
    if (!this.someDependencyHasChanged()) return
    const oldObserving = this.observing
    const [newValue, newObserving] = track(this.context, this.derivation)
    this.value = newValue
    this.observing = newObserving
    registerDependencies(this.markDirty, oldObserving, newObserving)
    this.inputValues = recordInputSet(newObserving)
    this.dirtyCount = 0
    this.state = UP_TO_DATE
  }
  getSet(value?) {
    switch (arguments.length) {
      case 0:
        // console.log("GET - "+ this.derivation.toString())
        // something being computed? setup tracking
        registerRead(this.context, this)
        // yay, we are up to date!
        if (this.state === UP_TO_DATE) return this.value
        // nope, we are not, and no one is observing either
        if (!this.context.currentlyComputing && !this.listeners.length) {
          // This won't actively remove any listener, but will transition the drv to 
          // untracked, if no other listener arrived
          // TODO: optimize: have one handler for this!
          // TODO: should there be an option to disable this optimization to prevent mem leaking?
          setTimeout(() => this.removeListener(null), 0)
        }
        // maybe scheduled, definitely tracking, value is needed, track now!
        this.track()
        return this.value
      case 1:
        if (this.setter) return void this.setter(value)
    }
    throw new Error("[drv] Didn't expect any arguments");
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
  // Sets are used, and keep insertion order, which is important for optimal performance! 
  // (to make someDependencyHasChanged cheap and not
  // re-evaluate deps that might not be needed in the future due some branching logic) 
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

function runAll(fns: Thunk[]): void {
  fns.forEach(runFn)
}

function runFn(fn: Thunk): void {
  fn()
}

function removeCallback(fns: Thunk[], fn: Thunk) {
  const idx = fns.indexOf(fn)
  if (idx >= 0) fns.splice(idx, 1)
}

function normalizePreProcessor(preProcessor: undefined | PreProcessor | PreProcessor[]): PreProcessor {
  if (!preProcessor) return defaultPreProcessor
  if (typeof preProcessor === "function") return preProcessor
  if (Array.isArray(preProcessor))
    return function(newValue, currentValue, api) {
      return preProcessor.reduce((acc, current) => current(acc, currentValue, api), newValue)
    }
  throw new Error("No valid preprocessor");
}

export function isVal(value: any): value is Val {
  return typeof value === "function" && value[$RVal] instanceof ObservableValue
}

export function isDrv(value: any): value is Drv {
  return typeof value === "function" && value[$RVal] instanceof Computed
}

export function _once<T extends Function>(fn: T): T {
  // based on 'once' package, but made smaller
  var f: any = function(this: any) {
    if (f.called) return f.value
    f.called = true
    return (f.value = fn.apply(this, arguments))
  }
  f.called = false
  return f
}

export function _deepfreeze(o) {
  // based on 'deepfreeze' package, but copied here to simplify build setup :-/
  if (o === Object(o)) {
    Object.isFrozen(o) || Object.freeze(o)
    Object.getOwnPropertyNames(o).forEach(function(prop) {
      prop === 'constructor' || _deepfreeze(o[prop])
    })
  }
  return o
}

function hiddenProp(target, key, value) {
  Object.defineProperty(target, key, {
    configurable: true,
    enumerable: false,
    writable: false,
    value: value
  })
}

export function _isPlainObject(o) {
  const p = o && typeof o === "object" && Object.getPrototypeOf(o)
  return p === Object.prototype || p === null
}

export const val = defaultInstance.val
export const drv = defaultInstance.drv
export const sub = defaultInstance.sub
export const act = defaultInstance.act
export const effect = defaultInstance.effect
export const configure = defaultInstance.configure
