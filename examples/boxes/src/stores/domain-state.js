import { val, drv, act } from "@r-val/core"

import {randomUuid} from '../utils';

function createBox(id, city, _x, _y, selection) {
    const name = val(city)
    const x = val(_x)
    const y = val(_y)
    const width = drv(() => name().length * 15)
    const selected = drv(() => selection() === id)
    return {
        id,
        name, x, y,
        width,
        selected
    }
}

export function createBoxesStore(initialState = {
    boxes: {},
    arrows: {},
    selection: null
}) {
    // TODO: support initial state, use models?
    const boxes = val({})
    const arrows = val({})
    const selection = val(null)

    function addBox(city, x, y) {
        const id = randomUuid()
        boxes({ ...boxes(), 
            [id]: createBox(id, city, x, y, selection)
        })
        return id
    }

    function addArrow(fromId, toId) {
        const id = randomUuid()
        arrows({
            ...arrows(),
            [id]: {
                id,
                from: fromId,
                to: toId
            }
        })
    }

    const id1 = addBox("Roosendaal", 100, 100)
    const id2 = addBox("Prague", 650, 300)
    const id3 = addBox("Tel Aviv", 150, 300)
    addArrow(id1, id2)
    addArrow(id2, id3)

    return {
        boxes,
        arrows,
        selection,
        addBox,
        addArrow
    }    
}

// /**
//     Generate 'amount' new random arrows and boxes
// */
export const generateStuff = act(function(store, amount) {
    const ids = Object.keys(store.boxes())
    for(var i = 0; i < amount; i++) {
        const id = store.addBox(
            '#' + i,
            Math.random() * window.innerWidth * 0.5,
            Math.random() * window.innerHeight
        )
        store.addArrow(ids[Math.floor(Math.random() * ids.length)], id)
        ids.push(id)
    }
})

