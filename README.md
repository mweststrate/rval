# RVal


[![npm](https://img.shields.io/npm/v/rval.svg)](https://www.npmjs.com/package/rval) [![size](http://img.badgesize.io/https://cdn.jsdelivr.net/npm/rval/core/index.module.js?compression=gzip)](http://img.badgesize.io/https://cdn.jsdelivr.net/npm/rval/core/index.module.js) [![install size](https://packagephobia.now.sh/badge?p=rval)](https://packagephobia.now.sh/result?p=rval) [![Build Status](https://travis-ci.org/mweststrate/rval.svg?branch=master)](https://travis-ci.org/mweststrate/rval) [![Coverage Status](https://coveralls.io/repos/github/mweststrate/rval/badge.svg?branch=master)](https://coveralls.io/github/mweststrate/rval?branch=master) [![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg)](https://github.com/prettier/prettier) [![Donate](https://img.shields.io/badge/Donate-PayPal-green.svg)](https://www.paypal.me/michelweststrate)

# The Philosophy of RVal

Why reactive values? In essence most of our programming work consists of transfering in-memory information from one place to another, transforming the information into new information, that is either human or machine digestable.
Data tranformations always introduces reduces redundant copies of data that need to be kept in sync with the original data.
In very trivial example of this problem might look like:

```javascript
const user = {
    firstName: "Jane",
    lastName: "Stanford",
    fullName: "Jane Stanford"
}

document.body.innerHTML = `<h1>Hello ${user.fullName}</h1>
```

This simple snippet introduces a redundant copy of the original user's name in the `fullName` property, and in the DOM.
Now it has become the programmers responsibility to make sure any futher changes to the `user` are propagated properly:

```javascript
function updateFirstName(newName) {
    user.firstName = newName
    user.fullName = user.firstName + " " + user.lastName
    document.body.innerHTML = `<h1>Hello ${user.fullName}</h1>
}
```

This is the problem that any state management abstraction, regardless the framework or paradigm that is used, is trying to solve.
RVal introduces a handful of primitives that help you to solve this problem in any context, by automating the question:
_when_ should _which_ transformation be applied?

Here is a quick overview in how RVal helps solving that problem.
First, we should recognize that imperatively computing new information, such as the DOM represantation, introduces stale values.
However, we can avoid ever storing such information by storing _computations_, rather than _values_.
The process for that is as simple as creating a _thunk_ (argumentless function) that capture the computation, rather than imperatively producing new values:

```javascript
const user = {
    firstName: "Jane",
    lastName: "Stanford",
    fullName: () => user.firstName + " " + user.lastName
}

const rendering = () => `<h1>Hello ${user.fullName()}</h1>`

document.body.innerHTML = rendering()

function updateFirstName(newName) {
    user.firstName = newName
    document.body.innerHTML = rendering()
}
```

We've made things slightly better now; we don't have to imperatively update `user.fullName` anymore if the name changes.
Similarly, we could captured the rendered representation of the user in the thunk called `rendering`.

By storing computations instead of values, we have reduced the amount of redundant information.
However, we still have to make sure that our changes are propagated, for example by updating the DOM whenever we change the `firstName` property.

But, what if we could _subscribe_ to our thunks? And thereby avoid the need to manually propagate state changes, and increasing decoupling in the process?
In other words, what if we could write something like:

```javascript
const user = { /* as-is */ }
const rendering = () => `<h1>Hello ${user.fullName()}</h1>`

on(rendering, () => {
    document.body.innerHTML = rendering()
})

function updateFirstName(newName) {
    user.firstName = newName
}
```

Well, here is the good news: This is exactly the kind of things RVal allows you to write, by introducing three concepts:
1. `val(value)` to create pieces of information that can change over time
2. `drv(thunk)` to create thunks that can be subscribed to
3. `sub(something, listener)` to create a listener that fires whenever the provided reactive value or thunk changes

With those concepts, we can rewrite our above listing as a combination of reactive values and thunks, that propagate the changes when needed!

```javascript
import { val, drv, sub } from "rval"

const user = {
    firstName: val("Jane"),
    lastName: val("Stanford"),
    fullName: drv(() => user.firstName() + " " + user.lastName())
}

const rendering = drv(`<h1>Hello ${user.fullName()}</h1>`)

// subscribe to the 'rendering' thunk
sub(rendering, () => {
    document.body.innerHTML = rendering()
})

function updateFirstName(newName) {
    // change the `firstName` reactive value to 'newName'
    // rval will make sure that any derivation and subscription impacted by this
    // change will be re-evaluated (and nothing more).
    user.firstName(newName)
}
```

# Api

## `val`

## `sub`

## `drv`

## `batch`

## batched:

## effect

## Immutability and freezing

## Working with objects

## Working with arrays

## Object models

## Scheduling details

## Private context

## Strictness options

# API


Tips:
- subscribe before read, or use `fireImmediately`
- typing self-object referring derivations
- share methouds by pulling out / `this` / prototype or Object.create (add tests!)
- dependency injection through type generation in closure
- maps versus array entries
- comparison preprocessors

Differences with MobX:

- No 2 phase tracking, slower, but enables custom scheduling of computations
- Clear mutability / immutablility story
- No object modification, decorators, cloning
- small, with isolated tracking, fit for in-library usage

Patterns

- objects
- objects with models
- arrays
- maps
- serialization, deserialization
- capturing parent ref (see test "todostore - with parent")
- with react
- with immer (`v(p(v(), draft => { })))`)
- working with references

Todo:

* [x] build all the packages
* [x] generate types `yarn tsc index.ts -t es2015 -d --outDir dist && mv dist/index.d.ts dist/rval.d.ts && rm dist/index.js &&`
* [x] test against generated packages
* [x] setup CI
* [ ] `drv(( tick ) => ())`
* [x] ~`sub({ scheduler, onInvalidate(f (track)))})`~ -> `effect`
* [ ] docs
* [ ] setup coveralls
* [x] rval-models
* [ ] rval-react
* [x] rval-immer
* [ ] custom schedulers
* [x] custom preprocessors
* [ ] rename `sub` to `on`?
* [ ] toJS
* [ ] config: warn on unbatched writes
* [ ] config: warn on untracked, stale reads
* [x] eliminate Reaction class
* [x] setup minification with minified class members
* [x] swap export statement in `tests/rval.ts` in CI to test minified build
* [x] mobx like evaluation order of drv
* [ ] fix sourcemaps for minified builds
* [ ] support name option

Latter
* [ ] setter for `drv`?
* [ ] MobX global state compatibility?
* [ ] Docs with docusaurus?