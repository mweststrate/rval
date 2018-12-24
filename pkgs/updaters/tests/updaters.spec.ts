import { val, drv, sub, act } from "@r-val/core"
import { toggle, inc, dec1, inc1, dec } from "@r-val/updaters"

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