import { val } from "@r-val/core"

import * as is from "sarcastic"


test('isNumber', () => {
    const v = val<any>(3, is.number)
  
    expect(() => v("4")).toThrow("3 must be a number")
    expect(v()).toBe(3)
    v(4)
    expect(v()).toBe(4)
})
  

describe('isShape', () => {
    const todoShape = is.shape({
      done: is.boolean,
      title: is.string
    })
  
    const todoStoreShape = is.shape({
      todos: is.arrayOf(todoShape)
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