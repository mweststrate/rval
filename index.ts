import * as once from "once";
import * as deepFreeze from "deepfreeze";
import produce, { Draft } from "immer";

export const $Merri = Symbol.for("$Merri");

export interface Observable<T = unknown> {
  (): T;
  [$Merri]: ObservableAdministration;
}

export interface Drv<T> extends Observable<T> {}

export interface Val<T> extends Observable<T> {
  (newValue: T): void;
}

export interface ObservableAdministration {
  addObserver(observer: Observer);
  removeObserver(observer: Observer);
}

export type Listener<T = any> = (value: T) => void;

export type Thunk = () => void;

export type Disposer = Thunk;

let isUpdating = false;
const pending: Reaction[] = [];
let currentlyComputing: Computed | undefined = undefined;

export function val<T>(initial: T): Val<T> {
  const observers: Observer[] = [];
  const adm = {
    addObserver(observer) {
      // TODO: use class
      observers.push(observer);
    },
    removeObserver(observer) {
      observers.splice(observers.indexOf(observer), 1);
    }
  };
  let state = initial;
  const res = Object.assign(
    function val(newValue?: T) {
      switch (arguments.length) {
        case 0:
          if (currentlyComputing)
            // optimize: same last touched by optimization as MobX
            currentlyComputing.addDependency(adm);
          return state;
        case 1:
          if (!isUpdating)
            throw new Error(
              "val can only be updated within an 'update' context"
            ); // TODO: make ok, but optionally support / enforce batching
          if (newValue !== state) {
            // TODO: run preprocessor(newValue, oldValue) here, and use it for comparison, or model instantiation!
            deepFreeze(newValue);
            state = newValue;
            observers.forEach(s => s.markDirty());
            observers.forEach(s => s.markReady(true));
          }
          break;
        default:
          throw new Error("val expects 0 or 1 arguments");
      }
    },
    {
      [$Merri]: adm
    }
  );
  return res;
}

export interface SubscribeOptions {
  fireImmediately?: boolean;
  scheduler?: (run: Thunk) => void;
}

interface Observer {
  markDirty();
  markReady(changed: boolean);
}

class Reaction implements Observer {
  scheduled = false;
  dirtyCount = 0;
  changedCount = 0;
  constructor(public src: Observable, public listener: Listener) {}
  markDirty() {
    this.dirtyCount++;
  }
  markReady(changed) {
    if (changed) this.changedCount++;
    if (--this.dirtyCount === 0) if (this.changedCount) this.schedule();
  }
  private schedule() {
    if (!this.scheduled) {
      this.scheduled = true;
      // TODO: run scheduler here!
      pending.push(this);
    }
  }
  run() {
    this.scheduled = false;
    this.listener(this.src());
  }
}

export function sub<T>(
  src: Observable<T>,
  listener: Listener<T>,
  options?: SubscribeOptions
): Disposer {
  // TODO: support options
  const observer = new Reaction(src, listener);
  src[$Merri].addObserver(observer);
  return once(() => {
    src[$Merri].removeObserver(observer);
  });
}
class Computed<T = any> implements ObservableAdministration, Observer {
  observers: Observer[] = [];
  observing: Set<ObservableAdministration> = new Set();
  dirtyCount = 0;
  changedCount = 0;
  state = undefined;
  constructor(public derivation: () => T) {}
  markDirty() {
    if (++this.dirtyCount === 1) this.observers.forEach(o => o.markDirty());
  }
  markReady(changed) {
    if (changed) this.changedCount++;
    if (--this.dirtyCount === 0) {
      const prevValue = this.state;
      this.track();
      const changed = this.state !== prevValue;
      this.observers.forEach(o => o.markReady(changed));
    }
  }
  addObserver(observer) {
    if (!this.observers.length) {
      this.track();
      this.observers.push(observer);
    }
  }
  removeObserver(observer) {
    this.observers.splice(this.observers.indexOf(observer), 1);
  }
  addDependency(sub: ObservableAdministration) {
    this.observing.add(sub);
  }
  get hot() {
    return this.observers.length;
  }
  track() {
    const prevComputing = currentlyComputing;
    currentlyComputing = this;
    const oldObserving = this.observing;
    this.observing = new Set();
    this.state = this.derivation(); // TODO error handling.
    // TODO: optimize
    this.observing.forEach(o => {
      if (!oldObserving.has(o)) o.addObserver(this);
    });
    oldObserving.forEach(o => {
      if (!this.observing.has(o)) o.removeObserver(this);
    });
    currentlyComputing = prevComputing;
  }
  get = () => {
    if (!this.hot) throw new Error("No observers!"); // or warn and return
    return this.state;
  };
}

export function drv<T>(derivation: () => T): Drv<T> {
  const state = new Computed<T>(derivation);
  return Object.assign(state.get, { [$Merri]: state });
}

// TODO: autowrap with update and warn?
export function update<R>(updater: () => R) {
  let prevUpdating = isUpdating;
  isUpdating = true;
  try {
    return updater();
  } finally {
    isUpdating = prevUpdating;
    if (!isUpdating) {
      runPendingSubscriptions();
    }
  }
}

export function modify<T>(
  updater: (draft: Draft<T>) => T | undefined
): (val: Val<T>) => void;
export function modify<T>(
  val: Val<T>,
  updater: (draft: Draft<T>) => T | undefined
);
export function modify(arg1, arg2?) {
  switch (arguments.length) {
    case 1:
      const p = produce(arg1);
      return void (val => p(val())); // TODO: introduce utilitiz (call(val) and up(val, value) to do type checking and avoid not a function errors!)
    case 2:
      return void arg1(produce(arg1(), updater));
    default:
      throw new Error("modify expects 1 or 2 arguments");
  }
}

export function updater<T extends Function>(fn: T): T {
  return (function updater() {
    const self = this;
    update(() => fn.apply(self, arguments));
  } as any) as T;
}

function runPendingSubscriptions() {
  while (pending.length) {
    // N.B. errors here cause other pending subscriptions to be aborted!
    // TODO: cancel that subscription instead and continue (try catch in run())
    pending.splice(0).forEach(s => s.run());
  }
}

const x = val(3);
const d = sub(x, x => {
  console.log(x);
});

const doubleX = drv(() => x() * 2);
const d2 = sub(doubleX, x => {
  console.log(x);
});

update(() => {
  x(4);
  x(6);
});

update(() => {
  x(7);
});

d();

update(() => {
  x(8);
});
