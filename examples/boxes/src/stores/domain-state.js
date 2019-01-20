import { v4 } from 'node-uuid'
import { val, drv, act } from '@r-val/core'

function createBox(data, selectionId) {
  const name = val(data.name)
  const x = val(data.x)
  const y = val(data.y)
  const width = drv(() => name().length * 15)
  const selected = drv(() => selectionId() === data.id)
  return {
    id: data.id,
    name,
    x,
    y,
    width,
    selected,
  }
}

export function createBoxesStore() {
  // TODO: support initial state, use models?
  const boxes = val({})
  const arrows = val({})
  const selectionId = val(null)
  const selection = drv(
    () => selectionId() ? boxes()[selectionId()] : null,
    (val) => selectionId(val ? val.id : null)  
  )

  function addBox(name, x, y) {
    const id = v4()
    boxes({ ...boxes(), [id]: createBox({id, name, x, y}, selectionId) })
    return id
  }

  function addArrow(fromId, toId) {
    const id = v4()
    arrows({
      ...arrows(),
      [id]: {
        id,
        from: fromId,
        to: toId,
      },
    })
  }

  function load(snapshot) {
    // without models, this is a bit cumersome
    const values = {}
    Object.keys(snapshot.boxes).forEach(key => {
        values[key] = createBox(snapshot.boxes[key], selectionId)
    })
    boxes(values)
    arrows(snapshot.arrows)
    selectionId(snapshot.selectionId)
  }

  const id1 = addBox('Roosendaal', 100, 100)
  const id2 = addBox('Prague', 650, 300)
  const id3 = addBox('Tel Aviv', 150, 300)
  addArrow(id1, id2)
  addArrow(id2, id3)

  return {
    boxes,
    arrows,
    selectionId,
    selection,
    addBox,
    addArrow,
    load: act(load)
  }
}

// /**
//     Generate 'amount' new random arrows and boxes
// */
export const generateStuff = act(function(store, amount) {
  const ids = Object.keys(store.boxes())
  for (var i = 0; i < amount; i++) {
    const id = store.addBox('#' + i, Math.random() * window.innerWidth * 0.5, Math.random() * window.innerHeight)
    // TODO: addArrow / addBox is slow and should use one single update instead
    store.addArrow(ids[Math.floor(Math.random() * ids.length)], id)
    ids.push(id)
  }
})
