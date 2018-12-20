import { rval, Val } from "@r-val/core"
import { produce, Draft } from "immer"

export function updater<T, U extends any[], R>(val: Val<T>,  updater: (draft: Draft<T>, ...args: U) => R): (...args: U) => R {
  return function(...args: U) {
    return rval(val).batch(() => {
      let res
      val(produce(val(), draft => {
        res = updater(draft, ...args)
      }))
      return res
    })
  }
}
