import React from 'react'
import { useAtomValue } from 'jotai/react'
import { mutableAtom } from 'jotai-valtio'

const countProxyAtom = mutableAtom(0)

function Counter() {
  const countProxy = useAtomValue(countProxyAtom)
  return (
    <div>
      count: {countProxy.value}{' '}
      <button onClick={() => ++countProxy.value}>inc</button>
    </div>
  )
}

export default function App() {
  return (
    <div className="App">
      <h1>Hello CodeSandbox</h1>
      <h2>Start editing to see some magic happen!</h2>
      <Counter />
    </div>
  )
}
