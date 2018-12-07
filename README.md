# RVal


[![npm](https://img.shields.io/npm/v/rval.svg)](https://www.npmjs.com/package/rval) [![size](http://img.badgesize.io/https://cdn.jsdelivr.net/npm/rval/core/index.module.js?compression=gzip)](http://img.badgesize.io/https://cdn.jsdelivr.net/npm/rval/core/index.module.js) [![install size](https://packagephobia.now.sh/badge?p=rval)](https://packagephobia.now.sh/result?p=rval) [![Build Status](https://travis-ci.org/mweststrate/rval.svg?branch=master)](https://travis-ci.org/mweststrate/rval) [![Coverage Status](https://coveralls.io/repos/github/mweststrate/rval/badge.svg?branch=master)](https://coveralls.io/github/mweststrate/rval?branch=master) [![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg)](https://github.com/prettier/prettier) [![Donate](https://img.shields.io/badge/Donate-PayPal-green.svg)](https://www.paypal.me/michelweststrate)

# Concepts

## `val`

## `sub`

## `drv`

## `batch`

- batched:

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
* [ ] setup CI
* [ ] docs
* [ ] coverage
* [x] rval-models
* [ ] rval-react
* [x] rval-immer
* [ ] custom schedulers
* [x] custom preprocessors
* [ ] toJS
* [ ] config: warn on unbatched writes
* [ ] config: warn on untracked, stale reads
* [x] eliminate Reaction class
* [x] setup minification with minified class members
* [ ] swap export statement in `tests/rval.ts` in CI to test minified build
* [ ] mobx evaluation order of drv
* [ ] fix sourcemaps for minified builds

Latter
* [ ] setter for `drv`?
* [ ] MobX global state compatibility?
* [ ] Docs with docusaurus?