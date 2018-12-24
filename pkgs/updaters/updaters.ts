export type KVMap<T> = {
  [key: string]: T
}

export const toggle = (val: boolean) => !val

export const inc = (by: number) => (val: number) => val + by

export const inc1 = inc(1)
export const dec1 = inc(-1)
export const dec = (by: number) => inc(-by)

export const replace = <T>(newVal: T) => _ => newVal

export function set<T>(key: number, value: T): (o: T[]) => T[]
export function set<T, K extends keyof T>(key: K, value: T[K]): (o: T) => T
export function set<V, T extends KVMap<V>>(key: string, value: V): (o: T) => T
export function set(key, value) {
  return o => {
    if (o[key] === value) return o // no-op
    if (Array.isArray(o)) {
      const res = o.slice()
      res[key] = value
      return res
    } 
    return { ...o, [key]: value }
  }
}

export function unset<T>(key: number): (o: T[]) => T[]
export function unset<T, K extends keyof T>(key: K): (o: T) => T
export function unset<V, T extends KVMap<V>>(key: string): (o: T) => T
export function unset(key) {
  return o => {
    if (Array.isArray(o)) return splice(key, 1)(o)
    if (!(key in o)) return o // Noop delete
    const res = {...o}
    delete res[key]
    return res
  }
}

export function push<T>(...values: T[]): (o: T[]) => T[]
export function push(...values) {
  return o => {
    if (!values.length) return o
    const res = o.slice()
    res.push(...values)
    return res
  }
}

export function splice<T>(idx?: number | undefined, deleteCount?: number | undefined, ...toAdd: T[]): (o: T[]) => T[]
export function splice(idx?: any, deleteCount?: any, ...toAdd: any[]): any {
  return o => {
    if (!arguments.length || ((deleteCount === 0 || idx >= o.length) && !toAdd.length)) return o // no changes
    const res = o.slice()
    res.splice.apply(res, arguments)
    return res
  }
}

export function shift<T>(val: T[]): T[] {
  if (!val.length) return val
  const res = val.slice()
  res.shift()
  return res
}

export function unshift<T>(...items: T[]): (o: T[]) => T[] 
export function unshift<T>(...items: T[]): (o: T[]) => T[] {
  return o => {
    if (!items.length) return o
    const res = o.slice()
    res.unshift(...items)
    return res
  }
}

export function pop<T>(val: T[]): T[] {
  if (!val.length) return val
  const res = val.slice()
  res.pop()
  return res
}

export const assign = <T>(v:T) => (o: T) => {
  if (!v) return o
  let change = false
  for (const key in v) if (o[key] !== v[key]) {
    change = true
    break
  }
  return (change ? Object.assign({}, o, v) : o) as T
}

export function removeBy<T>(predicate: (val: T) => boolean): (o: T[]) => T[]
export function removeBy<V, T extends KVMap<V>>(predicate: (val: V) => boolean): (o: T) => T
export function removeBy<T, K extends keyof T>(key: K, value: T[K]): (o: T[]) => T[]
export function removeBy<V, T extends KVMap<V>, K extends keyof V>(key: K, value: V[K]): (o: T) => T
export function removeBy(arg1, arg2?) {
  if (typeof arg1 !== "function")
    return removeBy(v => v[arg1] === arg2)
  return o => {
    if (Array.isArray(o)) {
      const res = o.filter(v => !arg1(v))
      return res.length === o.length ? o: res
    }
    let match = false
    const res = {}
    Object.keys(o).forEach(k => {
      if (!arg1(o[k]))
        res[k] = o[k]
      else
        match = true
    })
    return match ? res : o
  }
}

export function removeValue(value) {
  return removeBy(v => v === value)
}

