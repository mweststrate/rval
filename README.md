# RVal

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
- with react
- with immer (`v(p(v(), draft => { })))`)
- working with references

Todo:

* [ ] docs
* [ ] coverage
* [ ] rval-models
* [ ] rval-react
* [ ] rval-immer
* [ ] custom schedulers
* [x] custom preprocessors
* [ ] toJS
* [ ] config: warn on unbatched writes
* [ ] config: warn on untracked, stale reads
* [x] eliminate Reaction class
* [x] setup minification with minified class members
* [ ] swap export statement in `tests/rval.ts` in CI to test minified build

Latter
* [ ] setter for `drv`?
* [ ] MobX global state compatibility?
* [ ] Docs with docusaurus?