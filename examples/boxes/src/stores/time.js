import { sub, drv } from "@r-val/core"
import { toJS } from "@r-val/utils"

const states = [];
let currentFrame = -1;
let undoing = false

export function trackChanges(store) {
    const snapshot = drv(() => toJS(store))
    sub(snapshot, state => {
        // console.dir(state)
        if (!undoing) {
            states.splice(++currentFrame)
            states.push(toJS(state))
        }
    })
}

export function previousState(store) {
    if (currentFrame > 0) {
        currentFrame--;
        undoing = true
        store.load(states[currentFrame])
        undoing = false
    }
}

export function nextState(store) {
    if (currentFrame < states.length -1) {
        currentFrame++;
        undoing = true
        store.load(states[currentFrame])
        undoing = false
    }
}
