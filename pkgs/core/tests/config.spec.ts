import { val, sub, drv, rval } from '@r-val/core'

test('auto freeze', () => {
    {
        debugger
        const v = val<any>({ x: 1 })
        expect(() => v().y = 1).toThrow(/object is not extensible/)

        v({ x: { y: 1 }})
        expect(() => v().x.y = 1).toThrow(/Cannot assign to read only property 'y'/)
    }
    {
        const newContext = rval()
        const v = newContext.val<any>({ x: 1 })
        expect(() => v().y = 1).toThrow(/object is not extensible/)
        newContext.configure({
            autoFreeze: false
        })
        expect(v({ x: 1}))
        expect(() => v().x = 2).not.toThrow()
        expect(v().x).toBe(2)
        expect(() => v().y = 2).not.toThrow()
        expect(v().y).toBe(2)
    }
})