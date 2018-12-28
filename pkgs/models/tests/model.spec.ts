import { val } from "@r-val/core"
import { model, mapOf, arrayOf, invariant } from "@r-val/models"

test('simple model', () => {
  const Todo = model(() => ({
    title: val('test'),
  }))

  expect(() => {
    Todo(3 as any)
  }).toThrow('Model expects null, undefined or an object')
  expect(Todo(null as any)).toBe(null)
  expect(Todo(undefined as any)).toBe(undefined)
  expect(Todo({}).title()).toBe('test')
  expect(Todo({ title: 'hello' }).title()).toBe('hello')
  expect(() => {
    Todo({ title: 'test', bla: 3 }  as any)
  }).toThrow('bla')
  expect(Todo(null  as any, {}  as any)).toBe(null)
  expect(Todo({ title: 'xx' }, undefined).title()).toEqual('xx')

  const t1 = Todo({ title: 'hello' })
  const t2 = Todo({ title: 'world' }, t1)
  expect(t1).toBe(t2)
  expect(t2.title()).toBe('world')

  const t3 = Todo({ title: 'hello' })
  const t4 = Todo(Todo({ title: 'world' }), t3)
  expect(t3).not.toBe(t4)
  expect(t3.title()).toBe('hello')
  expect(t4.title()).toBe('world')
})

test('simple model - with key', () => {
  const Todo = model(
    () => ({
      id: 0,
      title: val('test'),
    }),
    'id'
  )

  expect(() => {
    Todo({})
  }).toThrow('required')

  {
    const t1 = Todo({ id: 0, title: 'hello' })
    const t2 = Todo({ id: 0, title: 'world' }, t1)
    expect(t1).toBe(t2)
    expect(t2.title()).toBe('world')
  }
  {
    const t1 = Todo({ id: 0, title: 'hello' })
    const t2 = Todo({ id: 1, title: 'world' }, t1)
    expect(t1).not.toBe(t2)
    expect(t1.title()).toBe('hello')
    expect(t2.title()).toBe('world')
  }
  {
    const t1 = Todo({ id: 0, title: 'hello' })
    const t2 = Todo(Todo({ id: 0, title: 'world' }), t1)
    expect(t1).not.toBe(t2)
    expect(t1.title()).toBe('hello')
    expect(t2.title()).toBe('world')
  }
})

test('invariant', () => {
    const Bool = invariant(x => typeof x === "boolean")
    const bool = val(false, Bool)
    bool(true)
    expect(bool()).toBe(true)
    expect(() => bool(0)).toThrow("Invariant failed")
    expect(bool()).toBe(true)
    expect(() => val(3, Bool)).toThrow("Invariant failed ")
})

describe('todostore', () => {
  function toggle(this: any) {
    this.done(!this.done())
  }
  const Todo = model(
    () => ({
      id: 0,
      title: val('test'),
      done: val(false),
      toggle,
    }),
    'id'
  )

  const Store = model(() => {
    const todos = val([], arrayOf(Todo))
    return {
      todos,
    }
  })

  it('basics', () => {

    const s = Store({
      todos: [
        {
          id: 1,
          title: 'hello',
          done: true,
        },
      ],
    })
    const t1 = s.todos()[0]
    expect(t1.title()).toBe('hello')
    expect(t1.done()).toBe(true)
    expect(t1.id).toBe(1)

    t1.toggle()
    expect(t1.done()).toBe(false)
  })

  it('reconciliation', () => {
    const s = Store({
      todos: [
        {
          id: 1,
          title: 'hello',
          done: true,
        },
      ],
    })
    const x = s.todos()[0]
    s.todos([
      {
        id: 2,
        title: 'boe',
      },
      ...s.todos(),
    ])
    const [t1, t2] = s.todos()
    expect(t1.title()).toBe('boe')
    expect(t2.title()).toBe('hello')
    expect(x).toBe(t2)

    s.todos([{ id: 3, title: 'hey' }, { id: 1, done: true }, Todo({ id: 2, done: true })])
    const [u1, u2, u3] = s.todos()
    expect(u1.title()).toBe('hey')
    expect(u2.title()).toBe('hello')
    expect(u2.done()).toBe(true)
    expect(u2).toBe(t2)
    expect(u3.title()).toBe('test')
    expect(u3.done()).toBe(true)
    expect(u3).not.toBe(t1)
  })
})


describe('todostore - with map', () => {
    function toggle(this: any) {
      this.done(!this.done())
    }
    const Todo = model(
      () => ({
        id: "",
        title: val('test'),
        done: val(false),
        toggle,
      }),
      'id'
    )

    const Store = model(() => {
      const todos = val({}, mapOf(Todo))
      return {
        todos,
      }
    })

    it('basics', () => {
      const s = Store({
        todos: {
          "a": {
            id: "a",
            title: 'hello',
            done: true,
          },
        },
      })
      const t1 = s.todos().a
      expect(t1.title()).toBe('hello')
      expect(t1.done()).toBe(true)
      expect(t1.id).toBe("a")
      t1.toggle()
      expect(t1.done()).toBe(false)
    })

    it('reconciliation', () => {
      const s = Store({
        todos: {
          a: {
            id: "a",
            title: 'hello',
            done: true,
          },
        },
      })
      const x = s.todos().a
      s.todos({
        "b": {
          id: "b",
          title: 'boe',
        },
        ...s.todos(),
      })
      {
        const {a, b} = s.todos()
        expect(a.title()).toBe('hello')
        expect(b.title()).toBe('boe')
        expect(x).toBe(a)
      }
      {
        const oldA = s.todos().a
        const oldB = s.todos().b
        s.todos({
          c: { id: 'c', title: 'hey' },
          a: { id: "a", done: true }, b: Todo({ id: "b", done: true })})
        const {a,b,c} = s.todos()
        expect(c.title()).toBe('hey')
        expect(a.title()).toBe('hello')
        expect(a.done()).toBe(true)
        expect(a).toBe(oldA)
        expect(b.title()).toBe('test')
        expect(b.done()).toBe(true)
        expect(b).not.toBe(oldB)
      }
    })
  })



describe('todostore - with parent', () => {
  function toggle(this: any) {
    this.done(!this.done())
  }
  const Todo = parent => model(
    () => ({
      id: 0,
      title: val('test'),
      done: val(false),
      toggle,
      remove() {
        parent.todos(parent.todos().filter(t => t !== this))
      }
    }),
    'id'
  )

  const Store = model(() => {
    const self = {}
    const todos = val([], arrayOf(Todo(self)))
    return Object.assign(self, {
      todos,
    })
  })

  it('basics', () => {
    const s = val({
      todos: [
        {
          id: 1,
          title: 'hello',
          done: true,
        },
      ],
    }, Store)
    const t1 = s().todos()[0]
    s({todos: [{
      id: 1, title: "world"
    }]})
    
    debugger;
    expect(s().toJS()).toEqual({
      todos: [
        { done: true, id: 0, title: "world" }
      ]
    })

    expect(t1.title()).toBe('world')
    expect(t1.done()).toBe(true)
    expect(t1).toBe(s().todos()[0])

    t1.remove()
    expect(s().todos().length).toBe(0)

  })
})

// TODO: store with drv, check liveleness of toJS