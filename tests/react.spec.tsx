import { val } from 'rval'
import { useVal } from 'rval/react'
import * as React from 'react'
import { render, waitForElement } from 'react-testing-library'

test('useVal - 1 ', async () => {
  const counter = val(0)
  const Comp = () => {
    const c = useVal(counter)
    return <h1>{c}</h1>
  }

  const re = render(<Comp />)
  expect(re.container.innerHTML).toEqual('<h1>0</h1>')

  counter(counter() + 1)
  await waitForElement(() => re.container.innerHTML === '<h1>1</h1>')

  counter(counter() + 1)
  await waitForElement(() => re.container.innerHTML === '<h1>2</h1>')
})
