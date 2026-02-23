import './App.css'

import { useEffect } from 'react'
import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { Token } from './Token'

function WalletButton() {
  const { address, chainId, isConnected } = useAccount()

  const { connectors, connect } = useConnect()
  const { disconnect } = useDisconnect()

  const switchToSepolia = async () => {
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0xaa36a7" }], // 11155111
      })
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    if (isConnected && chainId !== 11155111) {
      switchToSepolia()
    }
  }, [isConnected, chainId])

  if (isConnected)
    return <button onClick={() => disconnect()}>Disconnect {address}</button>

  return connectors.map((c) => (
    <button key={c.uid} onClick={() => connect({ connector: c })}>
      Connect with {c.name}
    </button>
  ))
}



function App() {

  return (
    <>
      <WalletButton />
      <Token />
    </>
  )
}

export default App
