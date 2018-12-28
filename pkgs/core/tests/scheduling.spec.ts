import { val, sub, drv, batch, effect, $RVal } from '@r-val/core'

function getDeps(thing) {
    return Array.from(thing[$RVal].listeners)
}

async function delay(time) {
    return new Promise(r => {
        setTimeout(() => r(), time)
    })
}

test("scheduling 1", async () => {
    const x = val(3)
    const y = drv(() => {
        events.push("compute y")
        return Math.round(x())
    })

    let events: any[] = []
    let p

    const d = effect(
        () => {
            events.push("compute")
            return y() * 2
        },
        (hasChanged, pull) => {
            p = pull
            events.push("invalidate")
            setTimeout(() => {
                if (hasChanged()) {
                    events.push("changed")
                    setTimeout(() => {
                        events.push("pulling")
                        pull() // doesn't recompute if not dirty!
                        events.push("got: "+ pull())
                    }, 10)
                } else {
                    events.push("not changed")
                    events.push("got: "+ pull())
                }
            }, 10)
        }
    )

    expect(events.splice(0)).toEqual([
        "invalidate",
    ])

    await delay(100)
    expect(events.splice(0)).toEqual([
        "changed",
        "pulling",
        "compute",
        "compute y",
        "got: " + 6
    ])

    expect(p()).toBe(6)
    
    await delay(50)
    expect(events.splice(0)).toEqual([    ])

    if (y[$RVal].markDirty) {
        // only check on non-minified build
        // should be exactly one dependency
        expect(getDeps(x)).toEqual([y[$RVal].markDirty])
    }
    x(4)
    expect(events.splice(0)).toEqual([
        "invalidate"
    ])

    await delay(50)

    expect(events.splice(0)).toEqual([
        "compute y",
        "changed",
        "pulling",
        "compute",
        "got: " + 8
    ])

    x(4.2)
    expect(events.splice(0)).toEqual([
        "invalidate",
    ])

    await delay(50)
    expect(events.splice(0)).toEqual([
        "compute y",
        "not changed",
        "got: " + 8
    ])

    d()
    x(5)
    await delay(50)

    expect(events.splice(0)).toEqual([    
    ])
})

test("drv are temporarily kept alive", async () => {
    let count = 0
    const x = val(1)
    const y = drv(() => {
        count++
        return x() * 2
    })

    expect(y()).toBe(2)
    expect(count).toBe(1)

    // kept alaive
    expect(y()).toBe(2)
    expect(count).toBe(1)

    x(2)
    expect(y()).toBe(4)
    expect(count).toBe(2)

    await delay(1000)
    expect(y()).toBe(4)
    expect(count).toBe(3)
    expect(y()).toBe(4)
    expect(count).toBe(3)

    x(3)
    expect(y()).toBe(6)
    expect(count).toBe(4)

    x(4)
    expect(count).toBe(4) // y() wasn't called
})
