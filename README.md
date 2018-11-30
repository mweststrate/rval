
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

* [ ] isolate scope
* [ ] custom schedulers
* [ ] custom preprocessors
* [ ] config: warn on unbatched writes
* [ ] config: warn on untracked, stale reads
* [ ] shape preprocessor
* [ ] with immer
* [ ] with react
* [ ] eliminate Reaction class?

