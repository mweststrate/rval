import { val, drv, sub, batched, updater } from "./rval"

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
    const toggle = batched(() => done(!done()))
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
      add: updater(todos, (draft, todo: ITodo) => {
        draft.push(Todo(todo))
      }),
      remove: updater(todos, (draft, id: string) => {
        const idx = draft.findIndex(todo => todo.id === id)
        draft.splice(idx, 1)
        return true
      }),
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
    debugger
    l.add({ id: "x", title: "test", done: true})
    expect(l.remove("a")).toBe(true)
    l.remove("x")
    expect(events).toEqual([
        0,
        1,
        0
    ])
  })
})
