import { isVal, deepfreeze, PreProcessor, Val, Drv } from "./rval-core";

const $factory = Symbol('$factory')

type SnapshotType<T> = {
    [K in keyof T]?: T[K] extends Val<infer X> ? X | SnapshotType<X> : T[K] extends Drv<any> ? never: T[K]
}

export function model<T>(factory: () => T, key?: keyof T): PreProcessor<SnapshotType<T>, T>
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
      const base = reconcilable ? currentValue : Object.assign(factory(), { [$factory]: factory })
      // update props
      for (let prop in newValue) {
        if (isVal(base[prop] === 'function')) {
          base[prop](newValue[prop])
        } else if (!reconcilable) {
          if (prop in base) base[prop] = newValue[prop]
          else throw new Error(`Property '${prop}' has not been declared in the model`)
        } else if (prop !== key) throw new Error(`Property '${prop}' cannot be updated`)
      }
      // freeze(base)
      return deepfreeze(base)
    },
    { key }
  )
}

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

export function invariant(predicate: (v) => boolean) {
    return function predicatePreProcessor(newValue) {
      if (!predicate(newValue)) throw new Error(`Invariant failed for value '${newValue}'`)
      return newValue
    }
  }
