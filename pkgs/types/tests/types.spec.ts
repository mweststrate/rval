import { val } from "@r-val/core"
import * as t from "@r-val/types"

test('isLiteral', () => {
  const v = val<any>(3, t.isLiteral(3))

  expect(() => v(4)).toThrow("Typecheck failed, expected '3', got: (number) '4'")
  expect(v()).toBe(3)
  v(3)
  expect(v()).toBe(3)
})


test('isNull', () => {
  const v = val<any>(null, t.isNull)

  expect(() => v(undefined)).toThrow("Typecheck failed, expected 'null', got: (undefined) 'undefined'")
  expect(v()).toBe(null)
  v(null)
  expect(v()).toBe(null)
})

test('isUndefined', () => {
  const v = val<any>(undefined, t.isUndefined)

  expect(() => v(null)).toThrow("Typecheck failed, expected 'undefined', got: (object) 'null'")
  expect(v()).toBe(undefined)
  v(undefined)
  expect(v()).toBe(undefined)
})

test('isNumber', () => {
  const v = val<any>(3, t.isNumber)

  expect(() => v("4")).toThrow("Typecheck failed, expected 'number', got: (string) '4'")
  expect(v()).toBe(3)
  v(4)
  expect(v()).toBe(4)
})

test('isString', () => {
  const v = val<any>("3", t.isString)

  expect(() => v(4)).toThrow("Typecheck failed, expected 'string', got: (number) '4'")
  expect(v()).toBe("3")
  v("4")
  expect(v()).toBe("4")
})

test('isBoolean', () => {
  const v = val<any>(false, t.isBoolean)

  expect(() => v(4)).toThrow("Typecheck failed, expected 'boolean', got: (number) '4'")
  expect(v()).toBe(false)
  v(true)
  expect(v()).toBe(true)
})

test('isFunction', () => {
  const v = val<any>(() => {}, t.isFunction)

  expect(() => v(4)).toThrow("Typecheck failed, expected 'function', got: (number) '4'")
  expect(v()).toBeInstanceOf(Function)
  v(() => () => {})
})

test('isInstanceOf', () => {
  class X {

  }

  const v = val<any>(new X, t.isInstanceOf(X))

  expect(() => v({})).toThrow("Typecheck failed, expected 'X', got: (object) '{}'")
  expect(v()).toBeInstanceOf(X)
  v(new X)
})

test('isDate', () => {
  const v = val<any>(new Date, t.isDate)

  expect(() => v(4)).toThrow("Typecheck failed, expected 'Date', got: (number) '4'")
  expect(v()).toBeInstanceOf(Date)
  v(new Date)
})  

test('isMaybeDate', () => {
  const v = val<any>(new Date, t.isMaybe(t.isDate))

  expect(() => v(4)).toThrow("Typecheck failed, expected 'Date | undefined | null', got: (number) '4'")
  expect(v()).toBeInstanceOf(Date)
  v(new Date)
  expect(v()).toBeInstanceOf(Date)
  v(undefined)
  expect(v()).toBe(undefined)
  v(null)
  expect(v()).toBe(null)
})  

test('isEnum', () => {
  const v = val<any>("stop", t.isEnum(["stop", "start"]))

  expect(() => v(4)).toThrow("Typecheck failed, expected 'stop | start', got: (number) '4'")
  expect(v()).toBe("stop")
  v("start")
  expect(v()).toBe("start")
})

test('isArray', () => {
  const v = val<any>(["stop"], t.isArray(t.isEnum(["stop", "start"])))

  expect(() => v(["start", 4])).toThrow(`Typecheck failed, expected 'Array<stop | start>', got: (object) '["start",4]'`)
  expect(v()).toEqual(["stop"])
  v(["stop", "start"])
  expect(v()).toEqual(["stop", "start"])
  v([])
})

test('isMap', () => {
  const v = val<any>({x:"stop"}, t.isMap(t.isEnum(["stop", "start"])))

  expect(() => v({y: "stop", x: 4})).toThrow(`Typecheck failed, expected 'Map<stop | start>', got: (object) '{"y":"stop","x":4}'`)
  expect(v()).toEqual({x:"stop"})
  v({y: "stop", x: "stop"})
  expect(v()).toEqual({y: "stop", x: "stop"})
  v({})
})

describe('isShape', () => {
  const todoShape = t.isShape({
    done: t.isBoolean,
    title: t.isString
  })

  const todoStoreShape = t.isShape({
    todos: t.isArray(todoShape)
  })

  test('simple', () => {
    const t1 = val({ done: false, title: "get coffee"}, todoShape)
    expect(() => t1({} as any)).toThrowErrorMatchingSnapshot()
    expect(() => t1({ done: true, title: 3 } as any)).toThrowErrorMatchingSnapshot()
    t1({
      extra: 7,
      done: false,
      title: "stuff"
    } as any)
  })

  test('complex', () => {
    const store = val({
      todos: [{ done: false, title: "get coffee"}]
    }, todoStoreShape)

    expect(() => store({} as any)).toThrowErrorMatchingSnapshot()
    store({
      todos: []
    })
    expect(() => store({
      todos: [{ done: false, title: "get coffee"}, 3]
    } as any)).toThrowErrorMatchingSnapshot()
  })
})

test('invariant', () => {
  const x = val(3, t.invariant(p => p > 0))

  x(2)
  expect(() => x(-1)).toThrow("Typecheck failed, expected 'invariant 'p => p > 0'', got: (number) '-1'")
})
