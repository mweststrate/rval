import * as once from "once"
import * as deepFreeze from "deepfreeze"
import produce, {Draft} from "immer"

export const $Merri = Symbol.for("$Merri")

export interface Subscribeable<T = unknown> {
    (): T
    [$Merri]: Subscriber[]
}

export interface Drv<T> extends Subscribeable<T> { }

export interface Val<T> extends Subscribeable<T> {
    (newValue: T): void
}

export type Listener<T = any> = (value: T) => void

export type Thunk = () => void

export type Disposer = Thunk

let isUpdating = false
const pending: Subscriber[] = []

export function val<T>(initial: T): Val<T> {
    const subscriptions: Subscriber[] = []
    let state = initial
    const res = Object.assign(
        function val(newValue?: T) {
            switch (arguments.length) {
                case 0:
                    return state
                case 1:
                    if (!isUpdating) throw new Error("val can only be updated within an 'update' context")
                    if (newValue !== state) { // TODO: add comparison options
                        deepFreeze(newValue)
                        state = newValue
                        subscriptions.forEach(s => s.schedule())
                    }
                    break;
                default:
                    throw new Error("val expects 0 or 1 arguments");
            }
        }, {
            [$Merri]: subscriptions
        }
    )
    return res
}

export interface SubscribeOptions {
    fireImmediately?: boolean
    scheduler?: (run: Thunk) => void
}

class Subscriber {
    scheduled = false
    constructor(public src: Subscribeable, public listener: Listener) {}
    schedule() {
        if (!this.scheduled) {
            this.scheduled = true
            pending.push(this)
        }
    }
    run() {
        this.scheduled = false
        this.listener(this.src())
    }
}

export function sub<T>(src: Subscribeable<T>, listener: Listener<T>, options?: SubscribeOptions): Disposer {
    // TODO: support options
    const subscriber = new Subscriber(src, listener)
    src[$Merri].push(subscriber)
    return once(() => {
        const subs = src[$Merri]
        subs.splice(subs.indexOf(subscriber), 1)
    })
}

// TODO: autowrap with update and warn?
export function update<R>(updater: () => R) {
    let prevUpdating = isUpdating
    isUpdating = true
    try {
        return updater()
    } finally {
        isUpdating = prevUpdating
        if (!isUpdating) {
            runPendingSubscriptions()
        }
    }
}

export function modify<T>(updater: (draft: Draft<T>) => T | undefined): (val: Val<T>) => void
export function modify<T>(val: Val<T>, updater: (draft: Draft<T>) => T | undefined)
export function modify(arg1, arg2?) {
    switch (arguments.length) {
        case 1:
            const p = produce(arg1)
            return void (val => p(val())) // TODO: introduce utilitiz (call(val) and up(val, value) to do type checking and avoid not a function errors!)
        case 2:
            return void arg1(produce(arg1(), updater))
        default:
            throw new Error("modify expects 1 or 2 arguments")
    }
}


export function updater<T extends Function>(fn: T): T {
    return function updater() {
        const self = this
        update(() => fn.apply(self, arguments))
    } as any as T
}

function runPendingSubscriptions() {
    while(pending.length) {
        pending.splice(0).forEach(s => s.run())
    }
}

const x = val(3)
const d = sub(x, x => {
    console.log(x)
})

update(() => {
    x(4)
    x(6)
})

update(() => {
    x(7)
})

d()

update(() => {
    x(8)
})
