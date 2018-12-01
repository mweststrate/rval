
REALI
REActive LIbrary

Names

rval
rvals (reactive values)
depsies
lrl (lightweight reactive library)
trecker
reali
realy
realli
laiter
mobz
litey
litez
litex
deriver
derivr
stiek

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

Todo:

* [ ] custom schedulers
* [ ] custom preprocessors
* [ ] config: warn on unbatched writes
* [ ] config: warn on untracked, stale reads
* [ ] shape preprocessor
* [ ] with immer
* [ ] with react
* [x] eliminate Reaction class
* [ ] setup minification with minified class members
* [ ] swap export statement in `tests/rval.ts` in CI to test minified build

