import { val } from './rval'

const $factory = Symbol('$factory')

function model(factory, key?) {
  return Object.assign(
    function modelPreProcessor(newValue, currentValue?) {
      if (newValue == null) return newValue
      if (typeof newValue !== 'object') throw new Error('Model expects null, undefined or an object')
      if (newValue[$factory]) {
        if (newValue[$factory] !== factory) throw new Error(`Factory mismatch`)
        return newValue
      }
      if (key && newValue[key] === undefined) throw new Error(`Attribute '${key}' is required`)
      const reconcilable = currentValue && (!key || newValue[key] === currentValue[key])
      const base = reconcilable ? currentValue : Object.assign(factory(), { [$factory]: factory })
      // update props
      for (let prop in newValue) {
        if (typeof base[prop] === 'function') {
          // TODO: isVal
          base[prop](newValue[prop])
        } else if (!reconcilable) {
          if (prop in base) base[prop] = newValue[prop]
          else throw new Error(`Property '${prop}' has not been declared in the model`)
        } else if (prop !== key) throw new Error(`Property '${prop}' cannot be updated`)
      }
      // freeze(base) // TODO:
      return base
    },
    { key }
  )
}

function mapOf(model) {
  return function mapPreProcessor(newValue, currentValue) {
    const res = {}
    if (newValue)
      for (let key in newValue) {
        res[key] = model(newValue[key], currentValue && currentValue[key])
      }
    return res
  }
}

function arrayOf(model) {
  return function arrayPreProcessor(newValue, currentValue) {
    if (!newValue) return []
    const { key } = model
    if (!key || !currentValue || !currentValue.length) return newValue.map(v => model(v))
    const cache = new Map()
    currentValue.forEach(v => {
      if (v) cache.set(v[key], v)
    })
    return newValue.map(v => (v ? model(v, cache.get(v[key])) : v))
  }
}

function invariant(predicate: (v) => boolean) {
  return function predicatePreProcessor(newValue) {
    if (!predicate(newValue)) throw new Error(`Invariant failed for value '${newValue}'`)
    return newValue
  }
}

test('simple model', () => {
  const Todo = model(() => ({
    title: val('test'),
  }))

  expect(() => {
    Todo(3)
  }).toThrow('Model expects null, undefined or an object')
  expect(Todo(null)).toBe(null)
  expect(Todo(undefined)).toBe(undefined)
  expect(Todo({}).title()).toBe('test')
  expect(Todo({ title: 'hello' }).title()).toBe('hello')
  expect(() => {
    Todo({ title: 'test', bla: 3 })
  }).toThrow('bla')
  expect(Todo(null, {})).toBe(null)
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
