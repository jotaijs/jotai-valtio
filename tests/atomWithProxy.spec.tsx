/// <reference types="react/canary" />

import { afterEach, expect, test } from 'vitest';
import { StrictMode, Suspense } from 'react';
import { act, cleanup, render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
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

  render(
    <StrictMode>
      <Counter />
    </StrictMode>,
  );

  await screen.findByText('count: 1');

  await userEvent.click(screen.getByText('button'));
  await screen.findByText('count: 2');
  expect(proxyState.count).toBe(2);

  ++proxyState.count;
  await screen.findByText('count: 3');
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

  render(
    <StrictMode>
      <Counter />
    </StrictMode>,
  );

  await screen.findByText('count: 0');

  await userEvent.click(screen.getByText('button'));
  await screen.findByText('count: 1');
  expect(proxyState.nested.count).toBe(1);
  expect(otherSnap === snapshot(proxyState.other)).toBe(true);

  ++proxyState.nested.count;
  await screen.findByText('count: 2');
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

  const Controls = () => <button onClick={() => resolve()}>resolve</button>;

  await act(async () => {
    render(
      <StrictMode>
        <Controls />
        <Suspense fallback="loading">
          <Status />
        </Suspense>
      </StrictMode>,
    );
  });

  await screen.findByText('loading');
  resolve();
  await screen.findByText('status: done');

  await userEvent.click(screen.getByText('button'));
  await screen.findByText('loading');
  resolve();
  await screen.findByText('status: modified');
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

  render(
    <StrictMode>
      <Elements />
    </StrictMode>,
  );

  await screen.findByText('selected element: none');
  await userEvent.click(screen.getByText('create and select element'));
  screen.getByText('selected element: element'); // synchronous
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

  render(
    <StrictMode>
      <Counter />
    </StrictMode>,
  );

  await screen.findByText('array0: 0');
  await userEvent.click(screen.getByText('button'));

  await screen.findByText('array0: 1');
  expect(proxyState.array.length).toBe(1);
});
