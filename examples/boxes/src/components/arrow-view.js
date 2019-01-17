import React from 'react'
import { rview, useLocalDrv } from '@r-val/react'

// TODO: when adding a new box, all arrow views will respond due to the lookup!
const ArrowView = ({ arrow, store }) => {
  const from = useLocalDrv(() => store.boxes()[arrow.from])
  const to = useLocalDrv(() => store.boxes()[arrow.to])
  return rview(() => {
    const [x1, y1, x2, y2] = [from.x() + from.width() / 2, from.y() + 30, to.x() + to.width() / 2, to.y() + 30]
    console.log('rendering arrow ' + arrow.id)
    return <path className="arrow" d={`M${x1} ${y1} L${x2} ${y2}`} />
  }, true)
}

export default ArrowView
