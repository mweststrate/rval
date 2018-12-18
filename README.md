# RVal


[![npm](https://img.shields.io/npm/v/rval.svg)](https://www.npmjs.com/package/rval) [![size](http://img.badgesize.io/https://unpkg.com/rval/dist/core.mjs?compression=gzip)](http://img.badgesize.io/https://unpkg.com/rval/dist/core.mjs?compression=gzip) [![Build Status](https://travis-ci.org/mweststrate/rval.svg?branch=master)](https://travis-ci.org/mweststrate/rval) [![Coverage Status](https://coveralls.io/repos/github/mweststrate/rval/badge.svg?branch=master)](https://coveralls.io/github/mweststrate/rval?branch=master) [![Donate](https://img.shields.io/badge/Donate-PayPal-green.svg)](https://www.paypal.me/michelweststrate) [![Donate](https://img.shields.io/badge/donate-buy%20me%20a%20coffee-orange.svg)](https://www.buymeacoffee.com/mweststrate)

TODO: publish docz docs somewhere and link

[Philosophy](docs/philosophy.mdx)
[Getting Started](docs/getting-started.mdx)

# concepts

val

drv

sub

objects

factories

structural immutability

mutability granularity

rendering iwth react

STATE DESIGN

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

ADVANCED
updaes wit immer

drv with setter


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
* [c] rval-react
* [x] rval-immer
* [x] custom schedulers
* [x] custom preprocessors
* [x] eliminate Reaction class
* [x] setup minification with minified class members
* [x] swap export statement in `tests/rval.ts` in CI to test minified build
* [x] mobx like evaluation order of drv
* [ ] docs
* [ ] `drv(( tick ) => ())`
* [ ] support currying for sub: `sub(listener)(val)`
* [ ] toJS
* [ ] `drv` with setter
* [ ] combine preprocessor array
* [ ] config: warn on unbatched writes
* [ ] config: warn on untracked, stale reads
* [ ] rval-validation
* [ ] rval-remote
* [ ] check https://reactpixi.org/#/stage / https://docs.setprotocol.com/#/#support-and-community- for setup of edit button, menu nesting, hosting
* [ ] strict mode: only reads from actions or reactions. Only updates from actions. 
* [ ] verify callign actions in reactions work correctly
* [ ] rename RvalContext to RvalInstance
* [ ] contributing and debugging
* [ ] support `this.rvalProps(this.rvalProps() + 1)` -> `this.rvalProps(x => x + 1)`?
* [ ] updaters `inc`, `push`, `set`, `delete`, `assign`


Later
* [ ] dynamically switch between hook and non-hook implementations (and explain differences)
* [ ] re-enable minification ootb
* [ ] fix sourcemaps for minified builds
* [ ] support name option
* [ ] abstraction for creating drv / vals and subscribing in hook based component automatically?
* [ ] setter for `drv`?
* [ ] MobX global state compatibility?
* [ ] use prop mangling for smaller builds