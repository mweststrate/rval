import { val, sub, drv, run, defaultInstance } from '@r-val/core'

test('very basic', () => {
  const x = val(3)
  let called = 0
  const events: any = []
  const s = sub(x, v => {
    called++
    events.push(v)
  })
  expect(events).toEqual([])
  expect(called).toBe(0)

  x(4)
  expect(events).toEqual([4])
  expect(called).toBe(1)
})

test("computeds don't re-evaluate if not changed", () => {
  const x = val(3)
  const events: any = []
  const y = drv(() => {
    events.push("y")
    x()
    return 2
  })
  const z = drv(() => {
    events.push("z")
    y()
  })
  const s = sub(z, v => {
    events.push(v)
  })
  events.push("init done")
  expect(events.splice(0)).toEqual(["z", "y", "init done"])

  x(4)
  expect(events.splice(0)).toEqual(["y"]) // no "z"; "y" didn't change, so "z" returned cached value
})

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

  run(() => {
    x(4)
    x(6)
  })

  expect(events.splice(0)).toEqual(['computing', 6, 'computing', 12])

  run(() => {
    x(7)
  })

  d()

  run(() => {
    x(8)
  })

  expect(events.splice(0)).toEqual([7, 'computing', 14, 'computing', 16])
})

test('drv is readable during run', () => {
  const events: any[] = []
  const a = val(2)
  const b = drv(() => {
    events.push('computing')
    return a() * 2
  })
  const d = sub(b, x => {
    events.push(x)
  })
  run(() => {
    a(3)
    a(4)
    expect(b()).toEqual(8)
    a(5)
    a(6)
  })
  expect(events).toEqual([
    'computing', // subscribing
    'computing', // in run
    'computing', // after run
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
  run(() => {
    a(3)
    a(4)
    expect(b()).toEqual(8)
  })
  expect(events).toEqual([
    'computing', // subscribing
    'computing', // in run
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
  run(() => {
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
  run(() => {
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
  expect(b()).toBe(4) // this computation is cached until next tick!
  a(3)
  expect(b()).toBe(6)
  expect(computed).toBe(2)
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
  run(() => {
    a(4)
  })
  events.push('b1')
  run(() => {
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
    'combined', // combined goes before b, as b doesn't need to be checked first, since 'a' already produced a change!
    'b*b',
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
    () => {
      events.push('combined')
      return a() > 5 ? aMulB() : aMulB() + aMinB()
    }
  )
  const d = sub(combined, val => events.push(val))

  events.push('setup')
  run(() => {
    a(4)
    b(6)
  })
  expect(events.splice(0)).toEqual([
    'combined',
    'a*b',
    'a-b',
    'setup',
    'combined',
    'a*b',
    'a-b',
    22,
  ])

  events.push('b1')
  a(6)
  expect(events.splice(0)).toEqual([
    'b1',
    'combined',
    'a*b',
    36,
  ])

  events.push('b2')
  run(() => {
    a(7)
    b(2)
  })
  expect(events.splice(0)).toEqual([
    'b2',
    'combined',
    'a*b',
    14,
  ])

  events.push('b3')
  a(4)
  events.push('b4')
  d()
  events.push('b6')
  a(6)
  expect(events.splice(0)).toEqual([
    'b3',
    'combined',
    'a*b',
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
  run(() => {
    a(4)
    expect([bCalled, cCalled, subCalled]).toEqual([1, 1, 0])
    expect(b()).toBe(8)
    expect([bCalled, cCalled, subCalled]).toEqual([2, 1, 0])
  })
  expect([bCalled, cCalled, subCalled]).toEqual([2, 2, 1])
  expect(c()).toBe(16)
  expect([bCalled, cCalled, subCalled]).toEqual([2, 2, 1])
})

test("val supports updater function", () => {
  const inc = i => i + 1
  const replace = value => () => value

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

test("drv supports setter", () => {
  const a = val(3)
  const b = drv(
    () => a() * 4,
    newValue => {
      a(newValue / 2)
      a(a() / 2)
    }
  )

  const values: any = []
  sub(b, v => values.push(v))
  a(4)
  b(20)
  expect(a()).toBe(5)
  expect(values).toEqual([16, 20]) // triggered only two updates
})

test("multiple preprocesors", () => {
  const api = defaultInstance
  const events: any[] = []
  const p = (newValue, baseValue, context) => {
    expect(context).toBe(defaultInstance)
    const res = newValue * 2
    events.push(`base: ${baseValue}, acc: ${newValue}, res: ${res}`)
    return res
  }
  const v = val(1, [p,p])
  expect(v()).toBe(4)
  expect(events.splice(0)).toEqual([
    "base: undefined, acc: 1, res: 2",
    "base: undefined, acc: 2, res: 4"
  ])

  v(5)
  expect(v()).toBe(20)
  expect(events.splice(0)).toEqual([
    "base: 4, acc: 5, res: 10",
    "base: 4, acc: 10, res: 20"
  ])
})

test("curried subscription", () => {
  const events: string[] = []
  const logger = sub<string|number>(value => events.push("Got: " + value))

  const a = val(1)
  const b = val("x")
  const d1 = logger(a);
  const d2 = logger(b);

  a(2)
  b("y")
  d1()
  a(3)
  b("z")
  d2()
  b("a")
  expect(events).toEqual([
    "Got: 2",
    "Got: y",
    "Got: z",
  ])
})

test("sub passed previous values", () => {
  const a = val(1)
  const events: any[] = []
  sub(a, (cur, prev) => {
    events.push([cur, prev])
  })
  a(2)
  run(() => {
    a(3)
    a(4)
  })
  expect(events).toEqual([
    [2, 1],
    [4, 2]
  ])
})

test("sub supports fireImmediately", () => {
  const a = val(1)
  const events: any[] = []
  sub(a, (cur, prev) => {
    events.push([cur, prev])
  }, { fireImmediately: true })
  a(2)
  run(() => {
    a(3)
    a(4)
  })
  expect(events).toEqual([
    [1, undefined],
    [2, 1],
    [4, 2]
  ])
})