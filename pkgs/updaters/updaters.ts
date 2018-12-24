export const toggle = (val: boolean) => !val

export const inc = (by: number) => (val: number) => val + by

export const inc1 = inc(1)
export const dec1 = inc(-1)
export const dec = (by: number) => inc(-by)

export const replace = <T>(newVal: T) => (_: T) => newVal

export function set<T, K extends keyof T>(key: K, value: T[K]): (o: T) => T
export function set(key, value) {
  return o => {
    if (o[key] === value) return o // no-op
    if (Array.isArray(o)) {
      const res = o.slice()
      res[key] = value
      return res
    } 
    return { ...o, key: value }
  }
}

export function remove<T, K extends keyof T>(key: K): (o: T) => T
export function remove(key) {
  return o => {
    if (Array.isArray(o)) return o.splice(key, 1)
    if (!(key in o)) return o // Noop delete
    const res = {...o}
    delete res[key]
    return res
  }
}

export function push<T>(value: T): (o: T[]) => T[]
export function push(value) {
  return o => {
    const res = o.slice()
    res.push(value)
    return res
  }
}

export function splice<T>(idx?: number, deleteCount?, toAdd?: T[]): (o: T[]) => T[]
export function splice(idx = 0, deleteCount = 0, toAdd = []) {
  return o => {
    if (!deleteCount && !toAdd.length) return o // no changes
    const res = o.slice()
    res.splice(idx, deleteCount, toAdd)
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

export const assign = v => o => {
  let change = false
  for (const key in v) if (o[key] !== v[key]) {
    change = true
    break
  }
  return change ? Object.assign({}, o, v) : o
}
