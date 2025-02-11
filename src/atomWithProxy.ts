import { atom } from 'jotai/vanilla';
import type { SetStateAction } from 'jotai/vanilla';
import { snapshot, subscribe } from 'valtio/vanilla';

const isObject = (x: unknown): x is object =>
  typeof x === 'object' && x !== null && !(x instanceof Promise);

const applyChanges = <T extends object>(proxyObject: T, prev: T, next: T) => {
  (Object.getOwnPropertyNames(prev) as (keyof T)[]).forEach((key) => {
    if (!(key in next)) {
      delete proxyObject[key];
    } else if (Object.is(prev[key], next[key])) {
      // unchanged
    } else if (
      isObject(proxyObject[key]) &&
      isObject(prev[key]) &&
      isObject(next[key])
    ) {
      applyChanges(
        proxyObject[key] as unknown as object,
        prev[key] as unknown as object,
        next[key] as unknown as object,
      );
    } else {
      proxyObject[key] = next[key];
    }
  });
  (Object.keys(next) as (keyof T)[]).forEach((key) => {
    if (!(key in prev)) {
      proxyObject[key] = next[key];
    }
  });
};

type Options = {
  sync?: boolean;
};

export function atomWithProxy<Value extends object>(
  proxyObject: Value,
  options?: Options,
) {
  const baseAtom = atom(snapshot(proxyObject));
  if (process.env.NODE_ENV !== 'production') {
    baseAtom.debugPrivate = true;
  }

  baseAtom.onMount = (setValue) => {
    const callback = () => {
      setValue(snapshot(proxyObject));
    };
    const unsub = subscribe(proxyObject, callback, options?.sync);
    callback();
    return unsub;
  };
  const derivedAtom = atom(
    (get) => get(baseAtom) as Value,
    (get, _set, update: SetStateAction<Value>) => {
      const newValue =
        typeof update === 'function'
          ? (update as (prev: Value) => Value)(get(baseAtom) as Value)
          : update;
      applyChanges(proxyObject, snapshot(proxyObject) as Value, newValue);
    },
  );
  return derivedAtom;
}
