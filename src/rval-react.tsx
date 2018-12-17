import { Observable, isVal, isDrv, defaultContext, rval, RValFactories } from "rval"
import { useState, useEffect, useMemo, ReactNode, ReactElement } from "react"
import * as React from "react"


export function useVal<T>(observable: Observable<T>): T {
    if (!isVal(observable) && !isDrv(observable)) throw new Error("useval - expected val or drv")
    let f; // forward ref to the updater function, so that we can subscribe first
    // this implementation could be simpler if we would first used `useState`,
    // and then set up the subscription in useEffect.
    // The benefit of this setup, is that we set up the subscription first,
    // so that observable is already 'hot' before we read it for the first time
    // See: test "useVal - mimimum computations - 2"
    // Note: `rval(sub)` makes sure we use the context of the observable passed in
    const disposer = useMemo(() => rval(observable).sub(observable, x => f(x)), [observable])
    const [val, updater] = useState(observable) // short-cut for initializer with fn: actually: () => observable()
    f = updater
    useEffect(() => disposer, [observable])
    return val
}

export function rview(render: () => ReactNode, rvalContext = defaultContext):  ReactElement<any> | null {
    return <RView rvalContext={rvalContext}>{render}</RView>
}

export function RView({ children, rvalContext = defaultContext }: { children?: () => ReactNode, rvalContext?: RValFactories }) :  ReactElement<any> | null {
    if (typeof children !== "function") throw new Error("RVal expected function as children")
    const [tick, setTick] = useState(0)
    const { render, dispose } = useMemo(() => {
        let render
        const dispose = rvalContext.effect(
            children!,
            (didChange, pull) => {
                render = pull
                if (didChange()) {
                    setTick(tick + 1)
                }
            }
        )
        return { render, dispose }
    }, [children])
    useEffect(() => dispose, [children])
    return render()
}
