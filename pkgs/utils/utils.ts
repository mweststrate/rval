import { isVal, isDrv } from "@r-val/core";
import { run } from "pkgs/core/dist/core";

// type SnapshotType<T> = {
//   [K in keyof T]?: T[K] extends Val<infer X, infer S>
//     ? X | S
//     : T[K] extends Drv<any>
//     ? never
//     : T[K] extends Function
//     ? never
//     : T[K] extends (string | number | boolean)
//     ? T[K]
//     : SnapshotType<T[K]>
// }

export function toJS(thing) {
  if (!thing) return thing;
  if (typeof thing.toJS === "function") return thing.toJS()
  if (isVal(thing) || isDrv(thing)) return toJS(thing())
  if (Array.isArray(thing)) return thing.map(toJS)
  if (typeof thing === "object" && (Object.getPrototypeOf(thing) === Object || Object.getPrototypeOf(thing) === null)) {
    const res = {}
    for(const key in thing) res[key] = toJS(thing[key])
    return res
  }
  return thing
}

export function assignVals(target, vals, ...moreVals) {
  if (moreVals.length)
    vals = Object.assign(vals, ...moreVals)
  run(() => {
    for (const key in vals) {
      if (isVal(target[key]) || isDrv(target[key]))
        target[key](vals[key])
      throw new Error(`[assignVals] value at key "${key}" is not a 'val' or 'drv'`)
    }
  })
  return target
}
