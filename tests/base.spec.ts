import { val, sub, drv, update } from '..'

test('some basic stuff', () => {
  const events: any[] = []
  const x = val(3)
  const d = sub(x, x => {
    events.push(x)
  })

  const doubleX = drv(() => {
    events.push("computing")
    return x() * 2
  })
  debugger
  const d2 = sub(doubleX, x => {
    events.push(x)
  })

  update(() => {
    x(4)
    x(6)
  })

  expect(events.splice(0)).toEqual([
    "computing", 6, "computing", 12
  ])

  update(() => {
    x(7)
  })

  d()

  update(() => {
    x(8)
  })

  expect(events.splice(0)).toEqual([
    7, "computing", 14, "computing", 16
  ])

})
