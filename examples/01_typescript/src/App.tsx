import React from 'react'
import { useAtom } from 'jotai/react'
import { atomWithProxy } from 'jotai/valtio'
import { proxy, subscribe } from 'valtio/vanilla'

const proxyState = proxy({ count: 0 })
subscribe(proxyState, () => {
  console.log('new count', proxyState.count)
})

const stateAtom = atomWithProxy(proxyState)

const Counter = () => {
  const [state, setState] = useAtom(stateAtom)

  return (
    <>
      count: {state.count}
      <button
        onClick={() =>
          setState((prev) => ({ ...prev, count: prev.count + 1 }))
        }>
        inc atom
      </button>
    </>
  )
}

export default function App() {
  return (
    <div className="App">
      <h1>Hello CodeSandbox</h1>
      <h2>Start editing to see some magic happen!</h2>
      <Counter />
      <button onClick={() => ++proxyState.count}>inc proxy</button>
    </div>
  )
}
