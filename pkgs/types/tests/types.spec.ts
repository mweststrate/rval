import { val } from "@r-val/core"
import { isNumber } from "@r-val/types"

test('simple model', () => {
  const v = val<any>(3, isNumber)

  expect(() => v("4")).toThrow("Typecheck failed, expected 'number', got: (string) '4'")
  expect(v()).toBe(3)
  v(4)
  expect(v()).toBe(4)
})