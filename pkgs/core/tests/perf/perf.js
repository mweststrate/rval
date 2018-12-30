var test = require("tape")
var rval = require("../../dist/core.js")
var updaters = require("../../../updaters/dist/updaters.js")
rval.configure({ deepFreeze: false })
var val = rval.val
var drv = rval.drv
var log = require("./index.js").logMeasurement

function gc() {
    if (typeof global.gc === "function") global.gc()
}

function voidObserver() {
    // nothing, nada, noppes.
}

/*
results of this test:
300/40000 mseconds on netbook (AMD c60 processor, same test is on Intel i7 3770 ~10 times faster)
220/37000 after removing forEach
140/30000 after not using (un)shift / pop / push
186/113 after remove filter/length call to detect whether depencies are stable. 300 times faster. w00t.

*/
test("one observes ten thousand that observe one", function(t) {
    gc()
    var a = val(2)

    // many observers that listen to one..
    var observers = []
    for (var i = 0; i < 10000; i++) {
        ;(function(idx) {
            observers.push(
                drv(function() {
                    return a() * idx
                })
            )
        })(i)
    }

    var bCalcs = 0
    // one observers that listens to many..
    var b = drv(function() {
        var res = 0
        for (var i = 0; i < observers.length; i++) res += observers[i]()
        bCalcs += 1
        return res
    })

    var start = now()

    rval.sub(b, voidObserver, true) // start observers
    t.equal(99990000, b())
    var initial = now()

    a(3)
    t.equal(149985000, b()) // yes, I verified ;-).
    //t.equal(2, bCalcs);
    var end = now()

    log(
        "One observers many observes one - Started/Updated in " +
            (initial - start) +
            "/" +
            (end - initial) +
            " ms."
    )
    t.end()
})

test("five hundrend properties that observe their sibling", function(t) {
    gc()
    var observables = [val(1)]
    for (var i = 0; i < 500; i++) {
        ;(function(idx) {
            observables.push(
                drv(function() {
                    return observables[idx]() + 1
                })
            )
        })(i)
    }

    var start = now()

    var last = observables[observables.length - 1]
    rval.sub(last, voidObserver)
    t.equal(501, last())
    var initial = now()

    observables[0](2)
    t.equal(502, last())
    var end = now()

    log(
        "500 props observing sibling -  Started/Updated in " +
            (initial - start) +
            "/" +
            (end - initial) +
            " ms."
    )
    t.end()
})

test("late dependency change", function(t) {
    gc()
    var values = []
    for (var i = 0; i < 100; i++) values.push(val(0))

    var sum = drv(function() {
        var sum = 0
        for (var i = 0; i < 100; i++) sum += values[i]()
        return sum
    })

    rval.sub(sum, voidObserver, { fireImmediately: true })

    var start = new Date()

    for (var i = 0; i < 10000; i++) values[99](i)

    t.equal(sum(), 9999)
    log("Late dependency change - Updated in " + (new Date() - start) + "ms.")
    t.end()
})

test("lots of unused computables", function(t) {
    gc()
    var a = val(1)

    // many observers that listen to one..
    var observers = []
    for (var i = 0; i < 10000; i++) {
        ;(function(idx) {
            observers.push(
                drv(function() {
                    return a() * idx
                })
            )
        })(i)
    }

    // one observers that listens to many..
    var b = drv(function() {
        var res = 0
        for (var i = 0; i < observers.length; i++) res += observers[i]()
        return res
    })

    var sum = 0
    var subscription = rval.sub(
        b,
        function(e) {
            sum = e
        },
        { fireImmediately : true }
    )

    t.equal(sum, 49995000)

    // unsubscribe, nobody should listen to a() now!
    subscription()

    var start = now()

    a(3)
    t.equal(sum, 49995000) // unchanged!

    var end = now()

    log("Unused computables -   Updated in " + (end - start) + " ms.")
    t.end()
})

test("many unreferenced observables", function(t) {
    gc()
    var a = val(3)
    var b = val(6)
    var c = val(7)
    var d = drv(function() {
        return a() * b() * c()
    })
    t.equal(d(), 126)
    var start = now()
    for (var i = 0; i < 10000; i++) {
        c(i)
        d()
    }
    var end = now()

    log("Unused observables -  Updated in " + (end - start) + " ms.")

    t.end()
})

test("array reduce", function(t) {
    gc()
    var aCalc = 0
    var ar = val([])
    var b = val(1)

    var sum = drv(function() {
        aCalc++
        return ar().reduce(function(a, c) {
            return a + c * b()
        }, 0)
    })
    rval.sub(sum, voidObserver)

    var start = now()

    for (var i = 0; i < 1000; i++) ar(updaters.push(i))

    t.equal(499500, sum())
    t.equal(1001, aCalc)
    aCalc = 0

    var initial = now()

    for (var i = 0; i < 1000; i++) ar(updaters.set(i, ar()[i] * 2))
    b(2)

    t.equal(1998000, sum())
    t.equal(1000, aCalc)

    var end = now()

    log("Array reduce -  Started/Updated in " + (initial - start) + "/" + (end - initial) + " ms.")
    t.end()
})

test("array classic loop", function(t) {
    gc()
    var ar = val([])
    var aCalc = 0
    var b = val(1)
    var sum = drv(function() {
        var s = 0
        aCalc++
        for (var i = 0; i < ar().length; i++) s += ar()[i] * b()
        return s
    })
    rval.sub(sum, voidObserver, { fireImmediately : true }) // calculate

    var start = now()

    t.equal(1, aCalc)
    for (var i = 0; i < 1000; i++) ar(updaters.push(i))

    t.equal(499500, sum())
    t.equal(1001, aCalc)

    var initial = now()
    aCalc = 0

    for (var i = 0; i < 1000; i++) ar(updaters.set(i, ar()[i] * 2))
    b(2)

    t.equal(1998000, sum())
    t.equal(1000, aCalc)

    var end = now()

    log("Array loop -  Started/Updated in " + (initial - start) + "/" + (end - initial) + " ms.")
    t.end()
})

function order_system_helper(t, usebatch, keepObserving) {
    gc()
    var orders = val([])
    var vat = val(2)

    var totalAmount = drv(function() {
        var sum = 0,
            l = orders().length
        for (var i = 0; i < l; i++) sum += orders()[i].total()
        return sum
    })

    function OrderLine(order, price, amount) {
        this.price = val(price)
        this.amount = val(amount)
        this.total = drv(() => {
            return order.vat() * this.price() * this.amount()
        })
    }

    function Order(includeVat) {
        this.includeVat = val(includeVat)
        this.lines = val([])

        this.vat = drv(
            () => {
                if (this.includeVat()) return vat()
                return 1
            }
        )

        this.total = drv(
            () =>  {
                return this.lines().reduce(function(acc, order) {
                    return acc + order.total()
                }, 0)
            }
        )
    }

    var disp
    if (keepObserving) disp = rval.sub(totalAmount, voidObserver)

    var start = now()

    function setup() {
        for (var i = 0; i < 100; i++) {
            var c = new Order(i % 2 == 0)
            orders(updaters.push(c))
            for (var j = 0; j < 100; j++) c.lines(updaters.unshift(new OrderLine(c, 5, 5)))
        }
    }

    if (usebatch) rval.act(setup)()
    else setup()

    t.equal(totalAmount(), 375000)

    var initial = now()

    function update() {
        for (var i = 0; i < 50; i++) orders()[i].includeVat(!orders()[i].includeVat())
        vat(3)
    }

    if (usebatch) rval.act(update)()
    else update()

    t.equal(totalAmount(), 500000)

    if (keepObserving) disp()

    var end = now()
    log(
        "Order system batched: " +
            usebatch +
            " tracked: " +
            keepObserving +
            "  Started/Updated in " +
            (initial - start) +
            "/" +
            (end - initial) +
            " ms."
    )

    t.end()
}

test("order system observed", function(t) {
    order_system_helper(t, false, true)
})

test("order system batched observed", function(t) {
    order_system_helper(t, true, true)
})

test("order system lazy", function(t) {
    order_system_helper(t, false, false)
})

test("order system batched lazy", function(t) {
    order_system_helper(t, true, false)
})

test("create array", function(t) {
    gc()
    var a = []
    for (var i = 0; i < 1000; i++) a.push(i)
    var start = now()
    for (var i = 0; i < 1000; i++) val(a)
    log("\nCreate array -  Created in " + (now() - start) + "ms.")
    t.end()
})

test("create array (fast)", function(t) {
    gc()
    var a = []
    for (var i = 0; i < 1000; i++) a.push(i)
    var start = now()
    for (var i = 0; i < 1000; i++) val(a)
    log("\nCreate array (non-recursive)  Created in " + (now() - start) + "ms.")
    t.end()
})

test("observe and dispose", t => {
    gc()

    var start = now()
    var a = val(1)
    var observers = []
    var MAX = 50000

    for (var i = 0; i < MAX * 2; i++) observers.push(rval.sub(drv(() => a()), voidObserver))
    a(2)
    // favorable order
    // + unfavorable order
    for (var i = 0; i < MAX; i++) {
        observers[i]()
        observers[observers.length - 1 - i]()
    }

    log("Observable with many observers  + dispose: " + (now() - start) + "ms")
    t.end()
})

test.skip("sort", t => {
    gc()

    function Item(a, b, c) {
        this.a = val(a)
        this.b = val(b)
        this.c = val(c)
        this.d = drv(() => {
            return this.a + this.b + this.c
        })
    }
    var items = val([])

    function sortFn(l, r) {
        items.length // screw all optimizations!
        l.d()
        r.d()
        if (l.a() > r.a()) return 1
        if (l.a() < r.a()) return -1
        if (l.b() > r.b()) return 1
        if (l.b() < r.b()) return -1
        if (l.c() > r.c()) return 1
        if (l.c() < r.c()) return -1
        return 0
    }

    var sorted = drv(() => {
        items.sort(sortFn)
    })

    var start = now()
    var MAX = 100000

    var ar = rval.sub(drv(() => sorted()))

    rval.act(() => {
        for (var i = 0; i < MAX; i++) items(updaters.push(new Item(i % 10, i % 3, i % 7)))
    })()

    log("expensive sort: created " + (now() - start))
    var start = now()

    for (var i = 0; i < 5; i++) {
        items[i * 1000].a = 7
        items[i * 1100].b = 5
        items[i * 1200].c = 9
    }

    log("expensive sort: updated " + (now() - start))
    var start = now()

    ar()

    log("expensive sort: disposed" + (now() - start))

    var plain = items.map(item => ({
        a: item.a, b: item.b, c: item.c
    }))
    t.equal(plain.length, MAX)

    var start = now()
    for (var i = 0; i < 5; i++) {
        plain[i * 1000].a = 7
        plain.sort(sortFn)
        plain[i * 1100].b = 5
        plain.sort(sortFn)
        plain[i * 1200].c = 9
        plain.sort(sortFn)
    }
    log("native plain sort: updated " + (now() - start))

    t.end()
})

test("computed temporary memoization", t => {
    "use strict"
    gc()
    var computeds = []
    for (let i = 0; i < 40; i++) {
        computeds.push(
            drv(() => (i ? computeds[i - 1]() + computeds[i - 1]() : 1))
        )
    }
    var start = now()
    t.equal(computeds[27](), 134217728)

    log("computed memoization " + (now() - start) + "ms")
    t.end()
})

test("Map: initializing", function(t) {
    gc()
    var iterationsCount = 100000
    var map
    var i

    var start = Date.now()
    for (i = 0; i < iterationsCount; i++) {
        map = val({})
    }
    var end = Date.now()
    log("Initilizing " + iterationsCount + " maps: " + (end - start) + " ms.")
    t.end()
})

test("Map: looking up properties", function(t) {
    gc()
    var iterationsCount = 1000
    var propertiesCount = 100
    var map = val({})
    var i
    var p

    for (p = 0; p < propertiesCount; p++) {
        map(updaters.set("" + p, p))
    }

    var start = Date.now()
    for (i = 0; i < iterationsCount; i++) {
        for (p = 0; p < propertiesCount; p++) {
            map()["" + p]
        }
    }
    var end = Date.now()

    log(
        "Looking up " +
            propertiesCount +
            " map properties " +
            iterationsCount +
            " times: " +
            (end - start) +
            " ms."
    )
    t.end()
})

test("Map: setting and deleting properties", function(t) {
    gc()
    var iterationsCount = 1000
    var propertiesCount = 100
    var map = val({})
    var i
    var p

    var start = Date.now()
    for (i = 0; i < iterationsCount; i++) {
        for (p = 0; p < propertiesCount; p++) {
            map(updaters.set("" + p, i))
        }
        for (p = 0; p < propertiesCount; p++) {
            map(updaters.unset("" + p))
        }
    }
    var end = Date.now()

    log(
        "Setting and deleting " +
            propertiesCount +
            " map properties " +
            iterationsCount +
            " times: " +
            (end - start) +
            " ms."
    )
    t.end()
})

function now() {
    return +new Date()
}
