import React from 'react';
import { effect } from '@r-val/core';

import {v4} from 'node-uuid';

export function randomUuid() {
    return v4();
}

export function RValRender({ children }) {
    const [tick, setTick] = React.useState(0)
    const { render, dispose } = React.useMemo(() => {
        let render
        const dispose = effect(
            children,
            (didChange, pull) => {
                render = pull
                if (didChange()) {
                    setTick(tick + 1)
                }
            }
        )
        return { render, dispose }
    }, [])
    React.useEffect(() => dispose, [])
    return render()
}
