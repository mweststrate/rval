import { isVal, _deepfreeze, PreProcessor, Val, Drv, drv } from "@r-val/core"
import { toJS, keepAlive } from "@r-val/utils";

const $factory = Symbol('$factory')

type SnapshotType<T> = {
  [K in keyof T]?: T[K] extends Val<infer X, infer S>
    ? X | S
    : T[K] extends Drv<any>
    ? never
    : T[K] extends Function
    ? never
    : T[K] extends (string | number | boolean)
    ? T[K]
    : SnapshotType<T[K]>
}

// TODO: pass bae value as first arg to factory? or call res.afterCreate() ? and what about other hooks? parents?
// TODO: pass RvalFactories in as second arg to factory?
// TODO: make sure the return value is made readonly, typewise!
export function model<T>(factory: () => T, key?: keyof T): PreProcessor<T, SnapshotType<T>>
export function model(factory, key?) {
  return Object.assign(
    function modelPreProcessor(newValue, currentValue?) {
      if (newValue == null) return newValue
      if (typeof newValue !== 'object') throw new Error('Model expects null, undefined or an object')
      if (newValue[$factory]) {
        if (newValue[$factory] !== factory) throw new Error(`Factory mismatch`)
        return newValue
      }
      if (key && newValue[key] === undefined) throw new Error(`Attribute '${key}' is required`)
      const reconcilable = currentValue && (!key || newValue[key] === currentValue[key])
      let base 
      if (reconcilable)
        base = currentValue
      else {
        const fromFactory = factory()
        const snapshot = drv(() => toJS(fromFactory))
        keepAlive(snapshot)
        base = Object.assign({ 
          [$factory]: factory,
          toJS: snapshot
        }, fromFactory) // Optimization: swapping args would probalby lot faster
      }
      // TODO: factory should set debug names
      // update props from the provided initial snapshot
      for (let prop in newValue) {
        if (isVal(base[prop])) {
          base[prop](newValue[prop])
        } else if (!reconcilable) {
          if (prop in base) base[prop] = newValue[prop]
          else throw new Error(`Property '${prop}' has not been declared in the model`)
        } else if (prop !== key) throw new Error(`Property '${prop}' cannot be updated`)
      }
      return _deepfreeze(base)
    },
    { key }
  )
}

export function mapOf<T, S>(model: PreProcessor<T, S>): PreProcessor<{ [key: string]: T }, { [key: string]: T | S }>
export function mapOf(model) {
  return function mapPreProcessor(newValue, currentValue) {
    const res = {}
    if (newValue)
      for (let key in newValue) {
        res[key] = model(newValue[key], currentValue && currentValue[key])
      }
    return res
  }
}

export function arrayOf<T, S>(model: PreProcessor<T, S>): PreProcessor<T[], (S | T)[]>
export function arrayOf(model) {
  return function arrayPreProcessor(newValue, currentValue) {
    if (!newValue) return []
    const { key } = model
    if (!key || !currentValue || !currentValue.length) return newValue.map(v => model(v))
    const cache = new Map()
    currentValue.forEach(v => {
      if (v) cache.set(v[key], v)
    })
    return newValue.map(v => (v ? model(v, cache.get(v[key])) : v))
  }
}

export function invariant<S, T>(predicate: (v: T) => boolean): PreProcessor<S, T>
export function invariant(predicate: (v) => boolean) {
  return function predicatePreProcessor(newValue) {
    if (!predicate(newValue)) throw new Error(`Invariant failed for value '${newValue}'`)
    return newValue
  }
}
