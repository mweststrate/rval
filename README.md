# RVal


[![npm](https://img.shields.io/npm/v/rval.svg)](https://www.npmjs.com/package/rval) [![size](http://img.badgesize.io/https://unpkg.com/rval/dist/core.mjs?compression=gzip)](http://img.badgesize.io/https://unpkg.com/rval/dist/core.mjs?compression=gzip) [![Build Status](https://travis-ci.org/mweststrate/rval.svg?branch=master)](https://travis-ci.org/mweststrate/rval) [![Coverage Status](https://coveralls.io/repos/github/mweststrate/rval/badge.svg?branch=master)](https://coveralls.io/github/mweststrate/rval?branch=master) [![Donate](https://img.shields.io/badge/Donate-PayPal-green.svg)](https://www.paypal.me/michelweststrate) [![Donate](https://img.shields.io/badge/donate-buy%20me%20a%20coffee-orange.svg)](https://www.buymeacoffee.com/mweststrate)


Docs in progress:

https://mweststrate.github.io/rval

STATE DESIGN

mutability granularity
refs

preprocessor validation

preprocessor objects

preprocessors
 - validation
 - conversion
 - equality checks
 - models
 - combing them


models


async


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

Comparison with mobx
- factory + getter / setters -> observable. More convenient, but, pit of success
- sub(drv(x), noop) === autorun(x)
- more scheduling control; effect

Comparison with Rx
- focus on values, not events
- push / pull vs. push
- transparent tracking

Todo:

* [x] build all the packages
* [x] generate types `yarn tsc index.ts -t es2015 -d --outDir dist && mv dist/index.d.ts dist/rval.d.ts && rm dist/index.js &&`
* [x] test against generated packages
* [x] setup CI
* [x] ~`sub({ scheduler, onInvalidate(f (track)))})`~ -> `effect`
* [x] setup coveralls
* [x] rval-models
* [x] rval-react
* [x] rval-immer
* [x] custom schedulers
* [x] custom preprocessors
* [x] eliminate Reaction class
* [x] setup minification with minified class members
* [x] swap export statement in `tests/rval.ts` in CI to test minified build
* [x] mobx like evaluation order of drv
* [x] `drv` with setter
* [x] combine preprocessor array
* [x] support currying for sub: `sub(listener)(val)`
* [x] rename RvalContext to RvalInstance
* [x] support `this.rvalProps(this.rvalProps() + 1)` -> `this.rvalProps(x => x + 1)`?
* [x] re-enable minification ootb
* [x] fix sourcemaps for minified builds
* [x] use prop mangling for smaller builds
* [x] fast class / object test
* [x] updaters `inc1`, `inc`, `push`, `set`, `delete`, `assign`, `toggle`
* [x] utils `assignVals`, `toJS
* [x] setter for `drv`?
* [x] host docs
* [x] check https://reactpixi.org/#/stage / https://docs.setprotocol.com/#/#support-and-community- for setup of edit button, menu nesting, hosting
* [x] `sub`, pass in previous value as second argumetn
* [x] implement `SubscribeOptions`
* [x] keepAlive drv option, using effect
* [x] publish all script
* [x] tests and types for utils
* [x] kill with-immmer?
* [x] improve updaters typings
* [x] verify callign actions in reactions work correctly
* [x] move `invariant` to preprocessors?
* [x] add `toJS` on all model types
* [x] rval-validation
* [x] kill `run`
* [x] fix debugging with minification
* [x] use yalc? https://www.google.com/url?q=https%3A%2F%2Fgithub.com%2Fwhitecolor%2Fyalc%2F&sa=D&sntz=1&usg=AFQjCNGCTXoCduIMdVHx5xm-uAs_REX3MA
* [ ] add missing mobx optimizations
* [ ] contributing and debugging
* [ ] docs
* [ ] add `reference` to models?
* [ ] contributing & debugging guide. `reserved` section in package.json!
* [ ] add (mobx like) performance tests
* [ ] rval.js.org CDN
* [ ] smart lack of act detection. Only have `act`, no `run`?
* [ ] rename MDX files to md
* [ ] rview as wrapper
* [ ] deep merge model tree?
* [ ] RVAL return this in setter for chaining?
* [ ] cheat sheet
* [ ] efficient map structure
* [ ] find neat solution to globally shared instance

Later
* [ ] rval-remote
* [ ] config: warn on unbatched writes
* [ ] config: warn on untracked, stale reads
* [ ] strict mode: only reads from actions or reactions. Only updates from actions. 
* [ ] eliminate classes from code base
* [ ] `drv(( tick ) => ())` to communicate staleness from inside drv (probably also needs onHot / onCold callback in such case)
* [ ] dynamically switch between hook and non-hook implementations (and explain differences)
* [ ] support name option
* [ ] abstraction for creating drv / vals and subscribing in hook based component automatically?
* [ ] MobX global state compatibility?