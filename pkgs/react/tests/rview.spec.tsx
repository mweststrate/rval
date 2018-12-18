import { val, drv, rval } from '@r-val/core'
import { rview, RView } from '@r-val/react'
import * as React from 'react'
import { render, waitForElement } from 'react-testing-library'
import { useState } from 'react';

function delay(time) {
  return new Promise(resolve => {
    setTimeout(resolve, time)
  })
}

test('rview - 1 ', async () => {
  const counter = val(0)
  const Comp = () => {
    return rview(() =>
      <h1>{counter()}</h1>
    )
  }

  const re = render(<Comp />)
  expect(re.container.innerHTML).toEqual('<h1>0</h1>')

  counter(counter() + 1)
  await waitForElement(() => re.container.innerHTML === '<h1>1</h1>')

  counter(counter() + 1)
  await waitForElement(() => re.container.innerHTML === '<h1>2</h1>')
})

test('rview - custom context ', async () => {
  const myRval = rval()
  const counter = myRval.val(0)
  const Comp = () => {
    return rview(() =>
      <h1>{counter()}</h1>
    , [], myRval)
  }

  const re = render(<Comp />)
  expect(re.container.innerHTML).toEqual('<h1>0</h1>')

  counter(counter() + 1)
  await waitForElement(() => re.container.innerHTML === '<h1>1</h1>')

  counter(counter() + 1)
  await waitForElement(() => re.container.innerHTML === '<h1>2</h1>')
})

test('rview - mimimum computations - 1', async () => {
  const counter = val(0)
  let called = 0
  const doubler = drv(() => {
    called++
    return counter() * 2
  })

  const Comp = () => <RView>{() =><h1>{doubler()}</h1>}</RView>
  

  const re = render(<Comp />)
  expect(re.container.innerHTML).toEqual('<h1>0</h1>')
  expect(called).toBe(1)

  counter(counter() + 1)
  await waitForElement(() => re.container.innerHTML === '<h1>2</h1>')
  expect(called).toBe(2)

  counter(counter() + 1)
  await waitForElement(() => re.container.innerHTML === '<h1>4</h1>')
  expect(called).toBe(3)
})

test('rview - mimimum computations - 2', async () => {
  const counter = val(0)
  let called = 0
  let renderOuter = 0
  let renderInner = 0
  const doubler = drv(() => {
    called++
    return counter() * 2
  })

  const Comp = () => {
    renderOuter++
    return rview(() => {
      renderInner++
      return <h1>{doubler()}</h1>
    })
  }

  const { container, unmount } = render(<Comp />)
  expect(container.innerHTML).toEqual('<h1>0</h1>')

  await delay(100)
  expect(called).toBe(1) 
  expect(renderOuter).toBe(1) 
  expect(renderInner).toBe(1) 

  counter(counter() + 1)
  await delay(100)
  expect(called).toBe(2) 
  expect(renderOuter).toBe(1) 
  expect(renderInner).toBe(2) 

  unmount()
  await delay(20)
  counter(counter() + 1)

  await delay(20)
  expect(called).toBe(2) 
  expect(renderOuter).toBe(1) 
  expect(renderInner).toBe(2) 
})

test('rview - mimimum computations - 3', async () => {
  const counter = val(0)
  let called = 0
  const doubler = drv(() => {
    called++
    return counter() * 2
  })

  const Comp = () => rview(() => <h1>{doubler()}</h1>)

  const { container, unmount } = render(<Comp />)
  expect(container.innerHTML).toEqual('<h1>0</h1>')

  await delay(100)
  expect(called).toBe(1) // and not 2!

  expect(doubler()).toBe(0)
  expect(called).toBe(1) // still hot

  unmount()
  expect(doubler()).toBe(0)
  expect(called).toBe(2) // and not 1, as the doubler is not hot anymore after unmount
})


test('rview - with memo - default / false', async () => {
  const counter = val(0)
  let renderOuter = 0
  let renderInner = 0
  let setTick

  const Comp = () => {
    renderOuter++
    const [tick, setter] = useState(0)
    setTick = setter
    return rview(() => {
      renderInner++
      return <h1>{counter()}-{tick}</h1>
    })
  }

  const { container } = render(<Comp />)

  await delay(20)
  expect(container.innerHTML).toEqual('<h1>0-0</h1>')
  expect(renderOuter).toBe(1) 
  expect(renderInner).toBe(1) 

  counter(1)
  await delay(20)
  expect(container.innerHTML).toEqual('<h1>1-0</h1>')
  expect(renderOuter).toBe(1) 
  expect(renderInner).toBe(2) 

  setTick(1)
  await delay(20)
  expect(container.innerHTML).toEqual('<h1>1-1</h1>')
  expect(renderOuter).toBe(2) 
  expect(renderInner).toBe(3) 

  counter(2)
  await delay(20)
  expect(container.innerHTML).toEqual('<h1>2-1</h1>')
  expect(renderOuter).toBe(2) 
  expect(renderInner).toBe(4) 

  setTick(2)
  await delay(20)
  expect(container.innerHTML).toEqual('<h1>2-2</h1>')
  expect(renderOuter).toBe(3) 
  expect(renderInner).toBe(5) 

  setTick(2)
  await delay(20)
  expect(container.innerHTML).toEqual('<h1>2-2</h1>')
  expect(renderOuter).toBe(4) 
  expect(renderInner).toBe(6) // produced new closure

  counter(2)
  await delay(20)
  expect(container.innerHTML).toEqual('<h1>2-2</h1>')
  expect(renderOuter).toBe(4) 
  expect(renderInner).toBe(6) 
})

test('rview - with memo - true', async () => {
  const counter = val(0)
  let renderOuter = 0
  let renderInner = 0
  let setTick

  const Comp = () => {
    renderOuter++
    const [tick, setter] = useState(0)
    setTick = setter
    return rview(() => {
      renderInner++
      return <h1>{counter()}-{tick}</h1>
    }, true)
  }

  const { container } = render(<Comp />)

  await delay(20)
  expect(container.innerHTML).toEqual('<h1>0-0</h1>')
  expect(renderOuter).toBe(1) 
  expect(renderInner).toBe(1) 

  counter(1)
  await delay(20)
  expect(container.innerHTML).toEqual('<h1>1-0</h1>')
  expect(renderOuter).toBe(1) 
  expect(renderInner).toBe(2) 

  setTick(1)
  await delay(20)
  expect(container.innerHTML).toEqual('<h1>1-0</h1>')
  expect(renderOuter).toBe(2) 
  expect(renderInner).toBe(2) 

  counter(2)
  await delay(20)
  expect(container.innerHTML).toEqual('<h1>2-1</h1>')
  expect(renderOuter).toBe(2) 
  expect(renderInner).toBe(3) 

  setTick(2)
  await delay(20)
  expect(container.innerHTML).toEqual('<h1>2-1</h1>')
  expect(renderOuter).toBe(3) 
  expect(renderInner).toBe(3) 

  setTick(2)
  await delay(20)
  expect(container.innerHTML).toEqual('<h1>2-1</h1>')
  expect(renderOuter).toBe(4) 
  expect(renderInner).toBe(3)

  counter(2)
  await delay(20)
  expect(container.innerHTML).toEqual('<h1>2-1</h1>') // no new render triggered, so tick stays stale
  expect(renderOuter).toBe(4) 
  expect(renderInner).toBe(3) 
})

test('rview - with memo - explicit [tick]', async () => {
  const counter = val(0)
  let renderOuter = 0
  let renderInner = 0
  let setTick

  const Comp = () => {
    renderOuter++
    const [tick, setter] = useState(0)
    setTick = setter
    return rview(() => {
      renderInner++
      return <h1>{counter()}-{tick}</h1>
    }, [tick])
  }

  const { container } = render(<Comp />)

  await delay(20)
  expect(container.innerHTML).toEqual('<h1>0-0</h1>')
  expect(renderOuter).toBe(1) 
  expect(renderInner).toBe(1) 

  counter(1)
  await delay(20)
  expect(container.innerHTML).toEqual('<h1>1-0</h1>')
  expect(renderOuter).toBe(1) 
  expect(renderInner).toBe(2) 

  setTick(1)
  await delay(20)
  expect(container.innerHTML).toEqual('<h1>1-1</h1>')
  expect(renderOuter).toBe(2) 
  expect(renderInner).toBe(3) 

  counter(2)
  await delay(20)
  expect(container.innerHTML).toEqual('<h1>2-1</h1>')
  expect(renderOuter).toBe(2) 
  expect(renderInner).toBe(4) 

  setTick(2)
  await delay(20)
  expect(container.innerHTML).toEqual('<h1>2-2</h1>')
  expect(renderOuter).toBe(3) 
  expect(renderInner).toBe(5) 

  setTick(2)
  await delay(20)
  expect(container.innerHTML).toEqual('<h1>2-2</h1>')
  expect(renderOuter).toBe(4) 
  expect(renderInner).toBe(5) // produced new closure, but that is ignored

  counter(2)
  await delay(20)
  expect(container.innerHTML).toEqual('<h1>2-2</h1>')
  expect(renderOuter).toBe(4) 
  expect(renderInner).toBe(5) 
})

test('rview - with use state', async () => {
  const counter = val(0)
  let called = 0
  let renderOuter = 0
  let renderInner = 0
  let setTick

  const doubler = drv(() => {
    called++
    return counter() * 2
  })

  const Comp = () => {
    renderOuter++
    const [tick, setter] = useState(0)
    setTick = setter
    return rview(() => {
      renderInner++
      return <h1>{doubler()}-{tick}</h1>
    })
  }

  const { container } = render(<Comp />)
  expect(container.innerHTML).toEqual('<h1>0-0</h1>')

  await delay(100)
  expect(called).toBe(1) 
  expect(renderOuter).toBe(1) 
  expect(renderInner).toBe(1) 

  await delay(30)
  setTick(1)

  await delay(30)
  expect(container.innerHTML).toEqual('<h1>0-1</h1>')
  expect(called).toBe(1) 
  expect(renderOuter).toBe(2) 
  expect(renderInner).toBe(2) 

  counter(counter() + 1)
  await delay(20)
  expect(container.innerHTML).toEqual('<h1>2-1</h1>')
  expect(called).toBe(2) 
  expect(renderOuter).toBe(2) 
  expect(renderInner).toBe(3) 
})

test('rview - with use state and inputs', async () => {
  const counter = val(0)
  let renderOuter = 0
  let renderInner = 0
  let setTick
  let setTick2

  const Comp = () => {
    renderOuter++
    const [tick, setter] = useState(0)
    const [tick2, setter2] = useState(0)
    setTick = setter
    setTick2 = setter2
    return rview(() => {
      renderInner++
      return <h1>{counter()}-{tick}-{tick2}</h1>
    }, [tick])
  }

  
  const { container } = render(<Comp />)
  
  await delay(20)
  expect(container.innerHTML).toEqual('<h1>0-0-0</h1>')
  expect(renderOuter).toBe(1) 
  expect(renderInner).toBe(1) 

  // not parts of inputs, so doesn't cause a render
  setTick2(2)
  await delay(20)
  expect(container.innerHTML).toEqual('<h1>0-0-0</h1>')
  expect(renderOuter).toBe(2) 
  expect(renderInner).toBe(1) 

  // parts of inputs, so cause a render, also making tick2 visible
  setTick(2)
  await delay(20)
  expect(container.innerHTML).toEqual('<h1>0-2-2</h1>')
  expect(renderOuter).toBe(3) 
  expect(renderInner).toBe(2) 

  // only causes inner to rerender
  counter(2)
  await delay(20)
  expect(container.innerHTML).toEqual('<h1>2-2-2</h1>')
  expect(renderOuter).toBe(3) 
  expect(renderInner).toBe(3) 
}, 60 * 1000 * 1000)
