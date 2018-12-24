import { val, sub, drv, act } from '@r-val/core'

test('some basic stuff', () => {
  const events: any = []
  const summer = {
    a: val(3),
    b: val(2),
    sum: drv(() => summer.a() + summer.b()),
  }

  sub(summer.sum, val => events.push(val))

  expect(summer.sum()).toBe(5)
  summer.a(2)
  expect(events).toEqual([4])
})

describe('todos', () => {
  interface ITodo {
    id: string
    title: string
    done: boolean
  }

  function Todo(initial: ITodo) {
    const title = val(initial.title)
    const done = val(initial.done)
    const toggle = act(() => done(!done()))
    return {
      id: initial.id,
      title,
      done,
      toggle,
    }
  }

  function TodoList(initialState: ITodo[]) {
    const todos = val(initialState.map(Todo))
    const completedCount = drv(() => todos().filter(todo => todo.done()).length)
    return {
      todos,
      add(todo: ITodo) {
        todos([...todos(), Todo(todo)])
      },
      remove(id) {
        todos(todos().filter(todo => todo.id !== id))
      },
      completedCount,
    }
  }

  const initialState = [
    {
      id: 'a',
      title: 'make coffee',
      done: false,
    },
    {
      id: 'b',
      title: 'grab cookie',
      done: true,
    },
  ]

  test('updates count', () => {
    const events: number[] = []
    const l = TodoList(initialState)
    sub(l.completedCount, c => events.push(c))
    expect(l.completedCount()).toBe(1)
    l.todos()[0].title("No effect")
    l.todos()[1].toggle()
    l.add({ id: "x", title: "test", done: true})
    l.remove("a")
    l.remove("x")
    expect(events).toEqual([
        0,
        1,
        0
    ])
  })

  test("direct manipulation should fail", () => {
    const l = TodoList(initialState)
    expect(() => {
        l.todos()[0].done = 3 as any
    }).toThrow("Cannot assign to read only property 'done'")
    expect(() => {
        l.todos().push(Todo({ id: "bla", title: "bla", done: false }))
    }).toThrow("object is not extensible")
  })
})

describe("using prototype", () => {
  interface ITodo {
    id: string
    title: string
    done: boolean
  }

  const TodoProto = {
    toggle(this: any) {
      this.done(!this.done())
    }
  }

  const TodoListProto = {
    add(this: any, todo: ITodo) {
      this.todos([...this.todos(), Todo(todo)])
    },
    remove(this: any, id) {
      this.todos(this.todos().filter(todo => todo.id !== id))
    },
  }

  function Todo(initial: ITodo) {
    return Object.assign(
      Object.create(TodoProto),
      {
        id: initial.id,
        title: val(initial.title),
        done: val(initial.done)
      }
    )
  }

  function TodoList(initialState: ITodo[]) {
    let self
    return self = Object.assign(
      Object.create(TodoListProto), {
      todos: val(initialState.map(Todo)),
      completedCount: drv(function (this: any) {
        return self.todos().filter(todo => todo.done()).length
      })
    })
  }

  const initialState = [
    {
      id: 'a',
      title: 'make coffee',
      done: false,
    },
    {
      id: 'b',
      title: 'grab cookie',
      done: true,
    },
  ]

  test('updates count', () => {
    const events: number[] = []
    const l = TodoList(initialState)
    sub(l.completedCount, c => events.push(c))
    expect(l.completedCount()).toBe(1)
    l.todos()[0].title("No effect")
    l.todos()[1].toggle()
    l.add({ id: "x", title: "test", done: true})
    l.remove("a")
    l.remove("x")
    expect(events).toEqual([
        0,
        1,
        0
    ])
  })

  test("direct manipulation should fail", () => {
    const l = TodoList(initialState)
    expect(() => {
        l.todos()[0].done = 3 as any
    }).toThrow("Cannot assign to read only property 'done'")
    expect(() => {
        l.todos().push(Todo({ id: "bla", title: "bla", done: false }))
    }).toThrow("object is not extensible")
  })

})


describe("using class", () => {
  interface ITodo {
    id: string
    title: string
    done: boolean
  }

  class Todo {
    readonly id
    readonly done = val(false)
    readonly title = val("")

    constructor(initial: ITodo) {
      this.id = initial.id
      this.done(initial.done)
      this.title(initial.title)
    }
    toggle() {
      this.done(!this.done())
    }
  }

  class TodoList {
    readonly todos = val<Todo[]>([])

    constructor(initial) {
      this.todos(initial.map(t => new Todo(t)))
    }

    readonly completedCount= drv(() => {
      return this.todos().filter(todo => todo.done()).length
    })

    add(this: any, todo: ITodo) {
      this.todos([...this.todos(), new Todo(todo)])
    }

    remove(this: any, id) {
      this.todos(this.todos().filter(todo => todo.id !== id))
    }
  }

  const initialState = [
    {
      id: 'a',
      title: 'make coffee',
      done: false,
    },
    {
      id: 'b',
      title: 'grab cookie',
      done: true,
    },
  ]

  test('updates count', () => {
    const events: number[] = []
    const l = new TodoList(initialState)
    sub(l.completedCount, c => events.push(c))
    expect(l.completedCount()).toBe(1)
    l.todos()[0].title("No effect")
    l.todos()[1].toggle()
    l.add({ id: "x", title: "test", done: true})
    l.remove("a")
    l.remove("x")
    expect(events).toEqual([
        0,
        1,
        0
    ])
  })

  test("direct manipulation should fail", () => {
    const l = new TodoList(initialState)
    expect(() => {
        (l.todos()[0] as any).done = 3
    }).toThrow("Cannot assign to read only property 'done'")
    expect(() => {
        l.todos().push(new Todo({ id: "bla", title: "bla", done: false }))
    }).toThrow("object is not extensible")
  })

})
