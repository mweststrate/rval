import { val, drv, sub, act } from "@r-val/core"
import {toJS, assignVals, keepAlive, when } from "@r-val/utils"
import { delay } from "q";

test("toJS", () => {
    expect(toJS(val(3))).toBe(3)

    expect(toJS(drv(() => 3))).toBe(3)

    expect(toJS(val({x: 3 }))).toEqual({x: 3})

    expect(toJS(val({x: 3, toJS() { return 2 } }))).toEqual(2)

    expect(toJS(val([3]))).toEqual([3])

    expect(toJS(val({x: val(3) }))).toEqual({x: 3})

    {
        const x = {x: 3}
        expect(toJS(x)).not.toBe(x)
    }
})

test("assignVals", () => {
    const x = {
        a: val(3),
        b: 2,
        c: drv(() => x.b * 2, v => { x.b = v}),
    }

    assignVals(x, {
        a: 2,
    }, {
        a: 4,
        c: 5
    })

    expect(toJS(x)).toEqual({
        a: 4,
        b: 5
    })
    expect(x.c()).toBe(10)
})

test("keepAlive", async () => {
    let calc = 0
    const x = val(1)
    const y = drv(() => {
        calc++
        return x()
    })
 
    await delay(10)
    const d = keepAlive(y)
    
    expect(calc).toBe(0)
    expect(y()).toBe(1)
    expect(calc).toBe(1)

    x(2)
    await delay(10)
    x(3)
    expect(calc).toBe(1)
    expect(y()).toBe(3)
    expect(calc).toBe(2)
    expect(y()).toBe(3)
    expect(calc).toBe(2)

    d()
    await delay(10)
    expect(y()).toBe(3)
    expect(calc).toBe(3)

    await delay(10)
    expect(y()).toBe(3)
    expect(calc).toBe(4)
})


test("when - val", async () => {
    const x = val(0)

    setTimeout(() => {
        x(1)
    }, 10)

    await when(x)
})


test("when - drv", async () => {
    let calcs = 0
    const x = val(0)
    const y = drv(() => {
        calcs++
        return x()
    })

    setTimeout(() => {
        x(1)
    }, 100)

    const p = when(y)
    expect(calcs).toBe(1)

    await p
    expect(calcs).toBe(2)
})

test("when - short circuit", async () => {
    let calcs = 0
    const x = val(1)
    const y = drv(() => {
        calcs++
        return x()
    })

    const p = when(y, 100)
    expect(calcs).toBe(1)

    await p
    expect(calcs).toBe(1)
})

test("when - timeout", async () => {
    const x = val(0)

    await expect(when(x, 100)).rejects.toMatchObject({ message: "TIMEOUT" })
})
