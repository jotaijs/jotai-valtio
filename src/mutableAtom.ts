import { atom } from 'jotai/vanilla';
import { proxy, snapshot, subscribe } from 'valtio/vanilla';

type Wrapped<T> = { value: T };

type ProxyFn<T> = (obj: Wrapped<T>) => Wrapped<T>;

type Options<T> = {
  proxyFn?: ProxyFn<T>;
};

export function mutableAtom<Value>(
  initialValue: Value,
  options: Options<Value> = defaultOptions,
) {
  const valueAtom = atom({ value: initialValue });

  if (process.env.NODE_ENV !== 'production') {
    valueAtom.debugPrivate = true;
  }

  const { proxyFn } = { ...defaultOptions, ...options };

  const storeAtom = atom<
    Store<Value>,
    [ActionWithPayload<'setValue', Value> | Action<'getValue'>],
    void | Value
  >(
    (_get, { setSelf }) => {
      const store: Store<Value> = {
        proxyState: createProxyState(() => store),
        getValue: () => setSelf({ type: 'getValue' }) as Value,
        setValue: (value: Value) =>
          setSelf({ type: 'setValue', payload: value }) as void,
      };
      return store;
    },
    (get, set, action) => {
      if (action.type === 'setValue') {
        set(valueAtom, { value: action.payload });
      } else if (action.type === 'getValue') {
        return get(valueAtom).value;
      }
    },
  );

  if (process.env.NODE_ENV !== 'production') {
    storeAtom.debugPrivate = true;
  }

  /**
   * sync the proxy state with the atom
   */
  function onChange(getStore: () => Store<Value>) {
    return () => {
      const { proxyState, getValue, setValue } = getStore();
      const { value } = snapshot(proxyState);
      if (!Object.is(value, getValue())) {
        setValue(value as Awaited<Value>);
      }
    };
  }

  /**
   * create the proxy state and subscribe to it
   */
  function createProxyState(getStore: () => Store<Value>) {
    const proxyState = proxyFn({ value: initialValue });
    // We never unsubscribe, but it's garbage collectable.
    subscribe(proxyState, onChange(getStore), true);
    return proxyState;
  }

  /**
   * wrap the proxy state in a proxy to ensure rerender on value change
   */
  function wrapProxyState(proxyState: ProxyState<Value>) {
    return new Proxy(proxyState, {
      get(target, property) {
        return target[property as keyof ProxyState<Value>];
      },
      set(target, property, value) {
        if (property === 'value') {
          target[property] = value;
          return true;
        }
        return false;
      },
    });
  }

  /**
   * create an atom that returns the proxy state
   */
  const proxyEffectAtom = atom<ProxyState<Value>>((get) => {
    get(valueAtom); // subscribe to value updates
    const store = get(storeAtom);
    return wrapProxyState(store.proxyState);
  });
  return proxyEffectAtom;
}

const defaultOptions = {
  proxyFn: proxy,
};

type Store<Value> = {
  proxyState: ProxyState<Value>;
  getValue: () => Value;
  setValue: (value: Value) => void;
};

export type ProxyState<Value> = { value: Value };

type Action<Type extends string> = {
  type: Type;
};

type ActionWithPayload<Type extends string, Payload> = Action<Type> & {
  payload: Payload;
};
