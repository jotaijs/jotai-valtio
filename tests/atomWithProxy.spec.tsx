/// <reference types="react/canary" />

import { afterEach, expect, test } from 'vitest';
import { StrictMode, Suspense } from 'react';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { useAtom } from 'jotai/react';
import { atom } from 'jotai/vanilla';
import { proxy, snapshot } from 'valtio/vanilla';
import { atomWithProxy } from 'jotai-valtio';

afterEach(cleanup);

test('count state', async () => {
  const proxyState = proxy({ count: 0 });
  const stateAtom = atomWithProxy(proxyState);
  ++proxyState.count;

  const Counter = () => {
    const [state, setState] = useAtom(stateAtom);

    return (
      <>
        count: {state.count}
        <button
          onClick={() =>
            setState((prev) => ({ ...prev, count: prev.count + 1 }))
          }
        >
          button
        </button>
      </>
    );
  };

  const { findByText, getByText } = render(
    <StrictMode>
      <Counter />
    </StrictMode>,
  );

  await findByText('count: 1');

  fireEvent.click(getByText('button'));
  await findByText('count: 2');
  expect(proxyState.count).toBe(2);

  ++proxyState.count;
  await findByText('count: 3');
  expect(proxyState.count).toBe(3);
});

test('nested count state', async () => {
  const proxyState = proxy({ nested: { count: 0 }, other: {} });
  const otherSnap = snapshot(proxyState.other);
  const stateAtom = atomWithProxy(proxyState);
  const Counter = () => {
    const [state, setState] = useAtom(stateAtom);

    return (
      <>
        count: {state.nested.count}
        <button
          onClick={() =>
            setState((prev) => ({
              ...prev,
              nested: { ...prev.nested, count: prev.nested.count + 1 },
            }))
          }
        >
          button
        </button>
      </>
    );
  };

  const { findByText, getByText } = render(
    <StrictMode>
      <Counter />
    </StrictMode>,
  );

  await findByText('count: 0');

  fireEvent.click(getByText('button'));
  await findByText('count: 1');
  expect(proxyState.nested.count).toBe(1);
  expect(otherSnap === snapshot(proxyState.other)).toBe(true);

  ++proxyState.nested.count;
  await findByText('count: 2');
  expect(proxyState.nested.count).toBe(2);
  expect(otherSnap === snapshot(proxyState.other)).toBe(true);
});

test('state with a promise', async () => {
  let resolve = () => {};
  const getAsyncStatus = (status: string) =>
    new Promise<string>((r) => (resolve = () => r(status)));

  const proxyState = proxy({
    status: getAsyncStatus('done'),
  });
  const stateAtom = atomWithProxy(proxyState);

  const Status = () => {
    const [state, setState] = useAtom(stateAtom);
    return (
      <>
        <span>status: {state.status}</span>
        <button
          onClick={() =>
            setState((prev) => ({
              ...prev,
              status: getAsyncStatus('modified'),
            }))
          }
        >
          button
        </button>
      </>
    );
  };

  const { findByText, getByText } = render(
    <StrictMode>
      <Suspense fallback="loading">
        <Status />
      </Suspense>
    </StrictMode>,
  );

  await findByText('loading');
  resolve();
  await findByText('status: done');

  fireEvent.click(getByText('button'));
  await findByText('loading');
  resolve();
  await findByText('status: modified');
});

test('synchronous atomWithProxy and regular atom ', async () => {
  const proxyState: { elements: Record<string, string> } = proxy({
    elements: {},
  });

  const stateAtom = atomWithProxy(proxyState, { sync: true });
  const selectedElementIdAtom = atom('');

  const createElementAtom = atom(null, (_, set) => {
    const id = '123';
    set(selectedElementIdAtom, id);
    proxyState.elements[id] = `element`;
  });

  const Elements = () => {
    const [state] = useAtom(stateAtom);
    const [selected] = useAtom(selectedElementIdAtom);
    const [, create] = useAtom(createElementAtom);

    return (
      <>
        <span>
          selected element:{' '}
          {selected === '' ? 'none' : state.elements[selected]}
        </span>
        <button
          onClick={() => {
            create();
          }}
        >
          create and select element
        </button>
      </>
    );
  };

  const { findByText, getByText } = render(
    <StrictMode>
      <Elements />
    </StrictMode>,
  );

  await findByText('selected element: none');
  fireEvent.click(getByText('create and select element'));
  getByText('selected element: element'); // synchronous
});

test('array.length state', async () => {
  const proxyState = proxy({ array: [0, 0] });
  const stateAtom = atomWithProxy(proxyState);

  const Counter = () => {
    const [state, setState] = useAtom(stateAtom);

    return (
      <>
        array0: {state.array[0]}
        <button onClick={() => setState({ array: [1] })}>button</button>
      </>
    );
  };

  const { findByText, getByText } = render(
    <StrictMode>
      <Counter />
    </StrictMode>,
  );

  await findByText('array0: 0');
  fireEvent.click(getByText('button'));

  await findByText('array0: 1');
  expect(proxyState.array.length).toBe(1);
});
