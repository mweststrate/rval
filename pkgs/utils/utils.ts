import { isVal, run, isDrv, Drv, Disposer, rval, _once, _isPlainObject, Val } from '@r-val/core'

// TODO: add typings!
export function toJS(thing) {
  if (!thing) return thing
  if (typeof thing.toJS === 'function') return thing.toJS()
  if (isVal(thing) || isDrv(thing)) return toJS(thing())
  if (Array.isArray(thing)) return thing.map(toJS)
  if (_isPlainObject(thing)) {
    const res = {}
    for (const key in thing)
      if (typeof thing[key] !== "function" || isVal(thing[key]))
        res[key] = toJS(thing[key])
    return res
  }
  return thing
}

type AssignVals<T> = {
  [K in keyof T]?: T[K] extends Val<infer T, infer S> ? T | S : T[K] extends Drv<infer T> ? T : never
}

export function assignVals<T>(target: T, vals: AssignVals<T>, ...moreVals: AssignVals<T>[])
export function assignVals(target, vals, ...moreVals) {
  if (moreVals.length) vals = Object.assign(vals, ...moreVals)
  run(() => {
    for (const key in vals) {
      if (isVal(target[key]) || isDrv(target[key])) target[key](vals[key])
      else throw new Error(`[assignVals] value at key "${key}" is not a 'val' or 'drv'`)
    }
  })
  return target
}

export function keepAlive(target: Drv<any>): Disposer {
  return rval(target).effect(
    target,
    _once((didChange, pull) => {
      didChange() // we never have to pull, we only detect for changes once, so that the target becomes hot
    })
  )
}
