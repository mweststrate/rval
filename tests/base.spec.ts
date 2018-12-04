import { val, sub, drv, batch } from './rval'

test('some basic stuff', () => {
  const events: any[] = []
  const x = val(3)
  const d = sub(x, x => {
    events.push(x)
  })

  const doubleX = drv(() => {
    events.push('computing')
    return x() * 2
  })
  const d2 = sub(doubleX, x => {
    events.push(x)
  })

  batch(() => {
    x(4)
    x(6)
  })

  expect(events.splice(0)).toEqual(['computing', 6, 'computing', 12])

  batch(() => {
    x(7)
  })

  d()

  batch(() => {
    x(8)
  })

  expect(events.splice(0)).toEqual([7, 'computing', 14, 'computing', 16])
})

test('drv is readable during batch', () => {
  const events: any[] = []
  const a = val(2)
  const b = drv(() => {
    events.push('computing')
    return a() * 2
  })
  const d = sub(b, x => {
    events.push(x)
  })
  batch(() => {
    a(3)
    a(4)
    expect(b()).toEqual(8)
    a(5)
    a(6)
  })
  expect(events).toEqual([
    'computing', // subscribing
    'computing', // in batch
    'computing', // after batch
    12,
  ])
})

test('drv is not re-evaluating if triggered eagerly', () => {
  const events: any[] = []
  const a = val(2)
  const b = drv(() => {
    events.push('computing')
    return a() * 2
  })
  const d = sub(b, x => {
    events.push(x)
  })
  batch(() => {
    a(3)
    a(4)
    expect(b()).toEqual(8)
  })
  expect(events).toEqual([
    'computing', // subscribing
    'computing', // in batch
    8,
  ])
})

test('drv is not reavaluating if unsubscribed early', () => {
  const events: any[] = []
  const a = val(2)
  const b = drv(() => {
    events.push('computing')
    return a() * 2
  })
  const d = sub(b, x => {
    events.push(x)
  })
  batch(() => {
    a(3)
    d()
    a(4)
  })
  expect(events).toEqual([
    'computing', // subscribing
  ])
})

test('drv can evaluate after unsubscribe', () => {
  const events: any[] = []
  const a = val(2)
  const b = drv(() => {
    events.push('computing')
    return a() * 2
  })
  const d = sub(b, x => {
    events.push(x)
  })
  batch(() => {
    a(3)
    d()
    a(4)
    expect(b()).toEqual(8)
  })
  expect(events).toEqual([
    'computing', // subscribing
    'computing', // evaluation
  ])
})

test('evaluate on demand', () => {
  const a = val(2)
  let computed = 0
  const b = drv(() => (computed++, a() * 2))
  expect(b()).toBe(4)
  expect(b()).toBe(4)
  a(3)
  expect(b()).toBe(6)
  expect(computed).toBe(3)
})

test('nested propagation', () => {
  const a = val(2)
  const b = val(3)
  const doubleA = drv(() => {
    events.push('a*a')
    return a() * a()
  })
  const events: any[] = []
  const doubleB = drv(() => (events.push('b*b'), b() * b()))
  const combined = drv(() => {
    events.push('combined')
    return doubleA() + doubleB() + doubleA()
  })

  const d = sub(combined, val => events.push(val))

  events.push('setup')
  batch(() => {
    a(4)
  })
  events.push('b1')
  batch(() => {
    a(7)
    b(2)
  })
  events.push('b4')
  d()
  events.push('b6')
  a(6)

  expect(events).toEqual([
    'combined',
    'a*a',
    'b*b',
    'setup',
    'a*a',
    'combined',
    41,
    'b1',
    'a*a',
    'b*b',
    'combined',
    102,
    'b4',
    'b6',
  ])
})

test('conditonal logic', () => {
  const a = val(2)
  const b = val(3)
  const aMulB = drv(() => (events.push('a*b'), a() * b()))
  const events: any[] = []
  const aMinB = drv(() => (events.push('a-b'), a() - b()))
  const combined = drv(
    () => (events.push('combined'), a() > 5 ? aMulB() : aMulB() + aMinB())
  )
  const d = sub(combined, val => events.push(val))

  events.push('setup')
  batch(() => {
    a(4)
    b(6)
  })
  events.push('b1')
  a(6)
  events.push('b2')
  batch(() => {
    a(7)
    b(2)
  })
  events.push('b3')
  a(4)
  events.push('b4')
  d()
  events.push('b6')
  a(6)

  expect(events).toEqual([
    'combined',
    'a*b',
    'a-b',
    'setup',
    'a*b',
    'a-b',
    'combined',
    22,
    'b1',
    'a*b',
    'a-b',
    'combined',
    36,
    'b2',
    'a*b',
    'combined',
    14,
    'b3',
    'a*b',
    'combined',
    'a-b',
    10,
    'b4',
    'b6',
  ])
})

test("no unchanged value propagation", () => {
  const a = val(3)
  const b = drv(() => a() - a()) // always 0
  let called = 0
  const d = sub(b, () => {
    called++
  })
  a(4)
  a(5)
  expect(called).toBe(0)
  d()
  a(6)
})


test("no unchanged value propagation - 2", () => {
  let bCalled = 0
  let cCalled = 0
  let subCalled = 0
  const a = val(3)
  const b = drv(() => (bCalled++, a() * 2))
  const c = drv(() => (cCalled++, b() * 2))
  const d = sub(c, () => {
    subCalled++
  })
  expect([bCalled, cCalled, subCalled]).toEqual([1, 1, 0]) // during initialization
  batch(() => {
    a(4)
    expect([bCalled, cCalled, subCalled]).toEqual([1, 1, 0])
    expect(b()).toBe(8)
    expect([bCalled, cCalled, subCalled]).toEqual([2, 1, 0])
  })
  expect([bCalled, cCalled, subCalled]).toEqual([2, 2, 1])
  expect(c()).toBe(16)
  expect([bCalled, cCalled, subCalled]).toEqual([2, 2, 1])
})
