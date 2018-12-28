import { val, drv, sub, act, _deepfreeze } from "@r-val/core"
import { toggle, inc, dec1, inc1, dec, replace, set, push, splice, shift, unshift, pop, assign, unset, removeBy, removeValue } from "@r-val/updaters"
import { append } from "ramda"
import produce from "immer";

test('toggle', () => {
  const x = val(false)
  x(toggle)
  expect(x()).toBe(true)
})

test("inc/ dec", () => {
  const x = val(2)
  x(inc(3))
  expect(x()).toBe(5)

  x(inc1)
  expect(x()).toBe(6)
  x(dec1)
  expect(x()).toBe(5)

  x(inc(3))
  expect(x()).toBe(8)
  x(dec(4))
  expect(x()).toBe(4)
})

test("replace", () => {
  const inc = i => i + 1

  const a = val(3)
  a(inc)
  expect(a()).toBe(4)

  const b = val<() => number>(() => 3)
  const fn = function anotherFunction() {
    return 4
  }
  b(() => fn)
  expect(b()).toBe(fn)
  expect(b()()).toBe(4)

  b(replace(() => 5))
  expect(b()()).toBe(5)
})

test("set", () => {
  const ar = [1,2]
  const obj = {
    a: 1,
    b: 2
  }

  expect(set("b", 3)(obj)).toEqual({ a: 1, b: 3})
  expect(set("b", 2)(obj)).toBe(obj)

  expect(set(1, 3)(ar)).toEqual([1, 3])
  expect(set(1, 2)(ar)).toBe(ar)
})

test("unset", () => {
  const ar = [1,2]
  const obj = {
    a: 1,
    b: 2
  }

  expect(unset("b")(obj)).toEqual({ a: 1})
  expect(unset("b")(obj)).not.toBe(obj)
  expect(unset("c")(obj)).toBe(obj)

  expect(unset(0)(ar)).toEqual([2])
  expect(unset(0)(ar)).not.toBe(ar)
  expect(unset(5)(ar)).toBe(ar)
})

test("push", () => {
  const x = []
  expect(push(3)(x)).not.toBe(x)
  expect(push(3)([1])).toEqual([1, 3])
  expect(push(3,4)([1])).toEqual([1, 3, 4])
  expect(push()(x)).toBe(x)
})

test("splice", () => {
  const x = [1,2]
  expect(splice()(x)).toBe(x)
  expect(splice(0)(x)).toEqual([])
  expect(splice(0)(x)).not.toBe(x)
  expect(splice(0,1)(x)).toEqual([2])
  expect(splice(5,1)(x)).toBe(x)
  expect(splice(5,1,3,4)(x)).toEqual([1,2,3,4])
  expect(splice(0,0,3,4)(x)).toEqual([3,4,1,2])
  expect(splice(0,1,3,4)(x)).toEqual([3,4,2])
})

test("shift", () => {
  const x = []
  const y = [1, 2]
  expect(shift(x)).toBe(x)
  expect(shift(y)).not.toBe(y)
  expect(shift(y)).toEqual([2])
})

test("unshift", () => {
  const y = [1, 2]
  expect(unshift()(y)).toBe(y)
  expect(unshift(1)(y)).not.toBe(y)
  expect(unshift(3,4)(y)).toEqual([3,4,1,2])
})

test("pop", () => {
  const x = []
  const y = [1, 2]
  expect(pop(x)).toBe(x)
  expect(pop(y)).not.toBe(y)
  expect(pop(y)).toEqual([1])
})

test("assign", () => {
  const base = {
    x: 1,
    y: 2
  }

  expect(assign({})(base)).toBe(base)
  expect(assign(null as any)(base)).toBe(base)
  expect(assign({x: 1, y: 2})(base)).toBe(base)
  expect(assign({x: 2, y: 2})(base)).not.toBe(base)
  expect(assign({x: 2, y: 2})(base)).toEqual({ x: 2, y: 2 })
  expect(assign({x: 2 })(base)).toEqual({ x: 2, y: 2 })
  expect(assign({x: 2, z: 2 })(base)).toEqual({ x: 2, y: 2, z: 2 })
})

test("unset / removeBy / removeValue", () => {
  const todo1 = {
    id: "1",
    title: "get coffee",
    done: false
  }
  const todo2 = {
    id: "2",
    title: "get cookie",
    done: false
  }

  const ar = [todo1, todo2]
  const obj = { todo1, todo2 }
  _deepfreeze(ar)
  _deepfreeze(obj)

  expect(unset(0)(ar)).toEqual([todo2])
  expect(unset("todo1")(obj)).toEqual({todo2})

  expect(removeBy(v => v.title.startsWith("get"))(ar)).toEqual([])
  expect(removeBy(v => v.title.startsWith("get"))(obj)).toEqual({})

  expect(removeBy(v => false)(ar)).toBe(ar)
  expect(removeBy(v => false)(obj)).toBe(obj)

  expect(removeBy("id", "2")(ar)).toEqual([todo1])
  expect(removeBy("id", "2")(obj)).toEqual({todo1})

  expect(removeBy("id", "3")(ar)).toBe(ar)
  expect(removeBy("id", "3")(obj)).toBe(obj)

  expect(removeValue({})(ar)).toBe(ar)
  expect(removeValue({})(obj)).toBe(obj)

  expect(removeValue(todo1)(ar)).toEqual([todo2])
  expect(removeValue(todo1)(obj)).toEqual({ todo2 })
})

test("it should append with ramda", () => {
  const numbers = val([1,2])
  numbers(append(3))
  expect(numbers()).toEqual([1,2,3])
})

test("it should produce with immer", () => {
  const numbers = val([1,2])
  numbers(produce(draft => { draft.push(3) }))
  expect(numbers()).toEqual([1,2,3])
})
