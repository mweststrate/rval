import { Observable, sub, isVal, isDrv } from "rval"
import { useState, useEffect } from "react"


export function useVal<T>(observable: Observable<T>): T {
    if (!isVal(observable) && !isDrv(observable)) throw new Error("useval - expected val or drv")
    const [val, updater] = useState(observable)
    useEffect(() => {
        const disposer = sub(observable, updater)
        // observable has changed before effect was run first time, so trigger additional update
        if (observable() !== val)
        updater(observable())
        return disposer
    }, [observable])
    return val
}

export function useDrv() {

}

// TODO: how to use correct context?
export function render() {

}
