/* eslint-disable react-hooks/react-compiler */

import { afterEach, expect, test } from 'vitest';
import {
  act,
  cleanup,
  render,
  renderHook,
  waitFor,
} from '@testing-library/react';
import {
  atom,
  getDefaultStore,
  useAtom,
  useAtomValue,
  useSetAtom,
} from 'jotai';
import { mutableAtom } from 'jotai-valtio';
import type { ProxyState } from 'jotai-valtio';

afterEach(cleanup);

test('should be defined on initial render', async () => {
  expect.assertions(1);
  const mutableCountAtom = mutableAtom(0);

  let countProxyIsDefined = false;
  let runCount = 0;
  function Test() {
    const countProxy = useAtomValue(mutableCountAtom);
    if (runCount === 0) {
      countProxyIsDefined = !!countProxy;
    }
    runCount++;
    return null;
  }

  render(<Test />);
  await waitFor(() => assert(runCount > 0));
  expect(countProxyIsDefined).toBeTruthy();
});

test('should rerender only when the proxy value changes', async () => {
  expect.assertions(2);
  const mutableCountAtom = mutableAtom(0);

  let runCount = 0;
  function useTest() {
    runCount++;
    const countProxy = useAtomValue(mutableCountAtom);
    return { countProxy };
  }

  const { result } = renderHook(useTest);

  // An extra re-render without a commit is an expected behavior
  expect(runCount).toBe(2);

  await act(async () => result.current.countProxy.value++);

  expect(runCount).toBe(3);
});

test('should handle updates correctly regardless of mount and unmount events', async () => {
  expect.assertions(7);
  const mutableCountAtom = mutableAtom(0);
  let targetAtom = mutableCountAtom;
  let hasRun = false;

  type TestResult = {
    countProxy: ProxyState<number>;
  };
  function useTest(): TestResult {
    hasRun = true;
    const countProxy = useAtomValue(targetAtom);
    return { countProxy };
  }

  let result: { current: TestResult };
  let unmount: () => void;
  function remount() {
    hasRun = false;
    ({ result, unmount } = renderHook(useTest));
  }
  ({ result, unmount } = renderHook(useTest));
  await waitFor(() => assert(hasRun));
  expect(result.current.countProxy.value).toBe(0);

  await act(async () => result.current.countProxy.value++);
  expect(result.current.countProxy.value).toBe(1);

  unmount();

  await act(async () => result.current.countProxy.value++);
  expect(result.current.countProxy.value).toBe(2);

  remount();

  await waitFor(() => assert(hasRun));
  expect(result.current.countProxy.value).toBe(2);

  await act(async () => result.current.countProxy.value++);
  expect(result.current.countProxy.value).toBe(3);

  unmount();

  // changing the target atom changes how the atom is mounted
  targetAtom = atom((get) => get(mutableCountAtom));
  remount();

  await waitFor(() => assert(hasRun));
  expect(result.current.countProxy.value).toBe(3);

  await act(async () => result.current.countProxy.value++);
  expect(result.current.countProxy.value).toBe(4);
});

test('should cause components to re-render when the proxy value changes', async () => {
  expect.assertions(6);
  const mutableCountAtom = mutableAtom(0);

  let runCount = 0;
  function useTest() {
    runCount++;
    return useAtomValue(mutableCountAtom);
  }

  const { result, rerender } = renderHook(useTest);

  // the runCount should be 2, an extra re-render without a commit is an expected behavior
  expect(runCount).toBe(2);
  expect(result.current.value).toBe(0);

  await act(async () => result.current.value++);
  expect(runCount).toBe(3);
  expect(result.current.value).toBe(1);

  rerender();
  expect(runCount).toBe(4);
  expect(result.current.value).toBe(1);
});

test('should proxy nested objects and arrays in the atom state correctly', async () => {
  expect.assertions(8);
  const mutableNestedObjectAtom = mutableAtom({
    array: [1, 2],
    object: { key: 'value' },
  });

  let runCount = 0;
  function useTest() {
    runCount++;
    const nestedObjectProxy = useAtomValue(mutableNestedObjectAtom);
    return { nestedObjectProxy };
  }

  const { result } = renderHook(useTest);

  expect(runCount).toBe(2);

  await act(async () => {
    result.current.nestedObjectProxy.value.array.push(3);
    expect(result.current.nestedObjectProxy.value.array).toEqual([1, 2, 3]);
  });
  expect(runCount).toBe(3);

  expect(result.current.nestedObjectProxy.value.array).toEqual([1, 2, 3]);

  await act(async () => {
    result.current.nestedObjectProxy.value.object.key = 'newValue';
    expect(result.current.nestedObjectProxy.value.object.key).toBe('newValue');
  });
  expect(runCount).toBe(4);
  expect(result.current.nestedObjectProxy.value.array).toEqual([1, 2, 3]);
  expect(result.current.nestedObjectProxy.value.object.key).toBe('newValue');
});

test('should update all subscribers when the proxy value changes', async () => {
  expect.assertions(6);
  const mutableCountAtom = mutableAtom(0);

  let runCount1 = 0;
  let runCount2 = 0;

  function useTest1() {
    runCount1++;
    const countProxy = useAtomValue(mutableCountAtom);
    return { countProxy };
  }

  function useTest2() {
    runCount2++;
    const countProxy = useAtomValue(mutableCountAtom);
    return { countProxy };
  }

  const { result: result1 } = renderHook(useTest1);
  const { result: result2 } = renderHook(useTest2);

  // both components should render for the initial value, an extra re-render without a commit is an expected behavior
  expect(runCount1).toBe(2);
  expect(runCount2).toBe(2);

  await act(async () => result1.current.countProxy.value++);

  // both components should rerender when the countProxy value changes
  expect(runCount1).toBe(3);
  expect(runCount2).toBe(3);

  await act(async () => result2.current.countProxy.value++);

  // both components should rerender when the countProxy value changes
  expect(runCount1).toBe(4);
  expect(runCount2).toBe(4);
});

test('should correctly handle multiple synchronous updates to the proxy', async () => {
  expect.assertions(4);

  const mutableCountAtom = mutableAtom(0);

  let runCount = 0;
  function useTest() {
    runCount++;
    const countProxy = useAtomValue(mutableCountAtom);
    return { countProxy };
  }

  // Rendering the hook
  const { result } = renderHook(useTest);

  // the component renders once initially.
  expect(runCount).toBe(2);
  expect(result.current.countProxy.value).toBe(0);

  // Applying multiple synchronous updates to the proxy
  await act(async () => {
    result.current.countProxy.value++;
    result.current.countProxy.value++;
    result.current.countProxy.value++;
  });

  // Assertions after updating the proxy
  expect(result.current.countProxy.value).toBe(3);
  expect(runCount).toBe(3);
});

test('should set falsy value', async () => {
  expect.assertions(1);
  const mutableCountAtom = mutableAtom(0);
  function useTest() {
    const countProxy = useAtomValue(mutableCountAtom);
    return { countProxy };
  }
  const { result } = renderHook(useTest);
  await act(async () => {
    result.current.countProxy.value = 0;
  });
  expect(result.current.countProxy.value).toBe(0);
});

test('should accept a function as a value', async () => {
  expect.assertions(4);
  const mutableFunctionAtom = mutableAtom<() => string>(() => 'foo');
  let runCount = 0;
  function useTest() {
    runCount++;
    const functionProxy = useAtomValue(mutableFunctionAtom);
    return { functionProxy };
  }
  const { result } = renderHook(useTest);
  expect(result.current.functionProxy.value()).toBe('foo');
  // an extra re-render without a commit is an expected behavior
  expect(runCount).toBe(2);
  await act(async () => {
    result.current.functionProxy.value = () => 'bar';
  });
  expect(runCount).toBe(3);
  expect(result.current.functionProxy.value()).toBe('bar');
});

test('should reject writing to properties other than `value`', async () => {
  expect.assertions(2);
  const mutableCountAtom = mutableAtom(0);
  function useTest() {
    const countProxy = useAtomValue(mutableCountAtom);
    return { countProxy };
  }
  const { result } = renderHook(useTest);
  expect(async () => {
    await act(async () => {
      result.current.countProxy.value = 1;
    });
  }).not.toThrow();
  expect(() => {
    // @ts-expect-error attempting to write to a property other than `value`
    result.current.countProxy.NOT_VALUE = 'TEST';
  }).toThrow(); // 'set' on proxy: trap returned falsish for property 'NOT_VALUE'
});

test('should allow updating even when component is unmounted', async () => {
  expect.assertions(2);
  const store = getDefaultStore();
  const mutableCountAtom = mutableAtom(0);

  await act(() => store.get(mutableCountAtom).value++);

  function useTest() {
    return useAtomValue(mutableCountAtom);
  }

  const { result, unmount } = renderHook(useTest);
  expect(result.current.value).toBe(1);
  unmount();
  await act(() => store.get(mutableCountAtom).value++);
  expect(store.get(mutableCountAtom).value).toBe(2);
});

test('should correctly handle updates via writable atom', async () => {
  expect.assertions(3);
  const mutableCountAtom = mutableAtom(0);
  const writableAtom = atom(null, (get, _, value: number) => {
    const countProxy = get(mutableCountAtom);
    expect(countProxy.value).toBe(-1);

    countProxy.value = value;
    expect(countProxy.value).toBe(value);

    countProxy.value++;
    expect(countProxy.value).toBe(value + 1);
  });
  let isMounted = false;
  writableAtom.onMount = () => {
    isMounted = true;
  };
  function useTest() {
    const countProxy = useAtomValue(mutableCountAtom);
    const [, setCount] = useAtom(writableAtom);
    return { countProxy, setCount };
  }
  const { result } = renderHook(useTest);
  await waitFor(() => assert(isMounted));
  await act(async () => {
    result.current.countProxy.value--;
    result.current.setCount(1);
  });
});

test('should perform synchronous update', async () => {
  expect.assertions(2);
  const mutableCountAtom = mutableAtom(0);
  const countIsNotZeroAtom = atom((get) => get(mutableCountAtom).value > 0);
  const incrementCountAtom = atom(null, (get) => {
    const countProxy = get(mutableCountAtom);
    expect(get(countIsNotZeroAtom)).toBe(false);
    countProxy.value++;
    expect(get(countIsNotZeroAtom)).toBe(true);
  });
  let isMounted = false;
  incrementCountAtom.onMount = () => {
    isMounted = true;
  };
  function useTest() {
    useAtom(countIsNotZeroAtom);
    const [, incrementCount] = useAtom(incrementCountAtom);
    return { incrementCount };
  }
  const { result } = renderHook(useTest);
  await waitFor(() => assert(isMounted));
  await act(async () => {
    result.current.incrementCount();
  });
});

// TODO: fix this infinite loop
test.skip('should not infinite loop when updating the proxy value in the read function', async () => {
  expect.assertions(2);
  const booleanAtom = atom(false);
  const mutableCountAtom = mutableAtom(0);
  let runCount = 0;
  let infiniteLoop = false;
  const readUpdateAtom = atom(
    (get) => {
      const countProxy = get(mutableCountAtom);
      if (runCount++ > 10) {
        infiniteLoop = true;
        return;
      }
      if (get(booleanAtom)) {
        countProxy.value++;
      }
      return countProxy.value;
    },
    () => {},
  );
  let isMounted = false;
  readUpdateAtom.onMount = () => {
    isMounted = true;
  };

  function useTest() {
    const count = useAtomValue(readUpdateAtom);
    const setBoolean = useSetAtom(booleanAtom);
    return { count, setBoolean };
  }
  const { result } = renderHook(useTest);
  await waitFor(() => assert(isMounted));
  await act(async () => {
    result.current.setBoolean(true);
  });
  expect(infiniteLoop).toBe(false);
  expect(result.current.count).toBe(1);
});

function assert(value: boolean, message?: string): asserts value {
  if (!value) {
    throw new Error(message ?? 'assertion failed');
  }
}
