import { 
          useState, 
          useEffect,
        } from 'react'
import {  useChainId, 
          useAccount,
          useReadContract, 
          useWriteContract,
          useSignTypedData,
          useSimulateContract
        } from 'wagmi'
import {
   encodeFunctionData 
       } from 'viem'

import UserProxy from '../../contracts/out/UserProxy.sol/UserProxy.json'
import Erc20 from '../../contracts/out/Faucet.sol/FaucetToken.json'

const erc20Addrs = {
  // Sepolia
    11155111: '0x4cBedDEDA88fDd9e116618a5cD71BB0E440C2A78'
}

const Address = ({ address }) => {
   if (!address) return null
   return (
      <a href={`https://eth-sepolia.blockscout.com/address/${address}?tab=read_write_contract`} target="_blank">{address}</a>
   )
}

const Token = () => {  
  const chainId = useChainId()
  const account = useAccount()

  const faucetAddr = chainId && erc20Addrs[chainId] 

  const { writeContract } = useWriteContract()
  const { signTypedDataAsync } = useSignTypedData()

  const [ balanceAmount, setBalanceAmount ] = useState("Loading...")
  const [ proxyAddr, setProxyAddr ] = useState(null)
  const [ proxyBalanceAmount, setProxyBalanceAmount ] = useState("Loading...")  
  const [ newProxyAddr, setNewProxyAddr ] = useState("")
  const [ txHash, setTxHash ] = useState(null)

  const [ transferToken, setTransferToken ] = useState("")
  const [ transferAmount, setTransferAmount ] = useState("")
  const [ transferTo, setTransferTo ] = useState("")

  const balance = useReadContract({
    address: faucetAddr,
    abi: Erc20.abi,
    functionName: 'balanceOf',
    args: account?.address ? [account.address] : undefined,   // wagmi v3 requires undefined until ready
    query: {
      enabled: Boolean(account?.address),             // don't run until wallet connected
    },
  })


  const proxyBalance = useReadContract({
    address: faucetAddr,
    abi: Erc20.abi,
    functionName: 'balanceOf',
    args: proxyAddr !== "Loading..." ? [proxyAddr] : undefined,   // wagmi v3 requires undefined until ready
    query: {
      enabled: Boolean(proxyAddr && proxyAddr !== "Loading..."),             // don't run until proxy is deployed
    },
  })

  const nonce = useReadContract({
      address: proxyAddr,
      abi: UserProxy.abi,
      functionName: 'nonce',
      args: [],
  })

  useEffect(() => {
    if (balance?.status === "success")
      setBalanceAmount(balance.data / 10n**18n)
    else
      setBalanceAmount("Loading...")  
  }, [balance])

  useEffect(() => {
    if (proxyBalance?.status === "success")
      setProxyBalanceAmount(proxyBalance.data / 10n**18n)
    else
      setProxyBalanceAmount("Loading...")  
  }, [proxyBalance])

  useEffect(() => {
    setTransferToken(faucetAddr)
  }, [faucetAddr])

  useEffect(() => {
    setTransferTo(account.address)
  }, [account.address])

  const proxyAddressChange = (evt) => setNewProxyAddr(evt.target.value)
  const transferTokenChange = (evt) => setTransferToken(evt.target.value)  
  const transferToChange = (evt) => setTransferTo(evt.target.value)  
  const transferAmountChange = (evt) => setTransferAmount(evt.target.value)  

  const deployUserProxy = async () => {
    try {
      const response = await fetch("/server/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ownerAddress: account.address })
      })
      const data = await response.json()
      setProxyAddr(data.contractAddress)
    } catch (err) {
      console.error("Error:", err)
    }
  }

  const signMessage = async(proxyAddr, calldata) => {
    const domain = {
        name: "UserProxy",
        version: "1",
        chainId,
        verifyingContract: proxyAddr,
    }

    const types = {
      SignedAccess: [
        { name: "target", type: "address" },
        { name: "data", type: "bytes" },          
        { name: "nonce", type: "uint256" },
      ],
    }

    const signature = await signTypedDataAsync({
      domain,
      types,
      primaryType: "SignedAccess",
      message: {
         target: faucetAddr,
         data: calldata,
         nonce: nonce.data,
      }
    })

    const r = `0x${signature.slice(2, 66)}`
    const s = `0x${signature.slice(66, 130)}`
    const v = parseInt(signature.slice(130, 132), 16)    

    return {v, r, s}
  }

  const messageUserProxy = async (proxy, target, data, v, r, s) => {
    try {
      const response = await fetch("/server/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proxy, target,  // both addresses
          data,           // calldata to send target
          v, r, s         // signature
        })
      })
      const serverResponse = await response.json()
      setTxHash(serverResponse.txHash)
    } catch (err) {
      console.error("Error:", err)
    }
  }

  const faucetSimulation = useSimulateContract({
    address: faucetAddr,
    abi: Erc20.abi,
    functionName: 'faucet',
    account: account.address
  })

  const proxyFaucet = async () => {
    const calldata = encodeFunctionData({
      abi: Erc20.abi,
      functionName: 'faucet',
      args: [],
    })

    const {v, r, s} = await signMessage(proxyAddr, calldata)
    messageUserProxy(proxyAddr, faucetAddr, calldata, v, r, s)
  }

  const proxyTransfer = async () => {
    const calldata = encodeFunctionData({
      abi: Erc20.abi,
      functionName: 'transfer',
      args: [transferTo, BigInt(transferAmount) * 10n**18n],
    })

    const {v, r, s} = await signMessage(proxyAddr, calldata)
    messageUserProxy(proxyAddr, faucetAddr, calldata, v, r, s)
  }  

  return (
    <>
      <div align="left">
         <h2>Token</h2>
         <h4>Token contract address <Address address={faucetAddr} /></h4>
         <hr />
         <h4>Direct access (as <Address address={account?.address} />)</h4>
         Your balance: {balanceAmount}
         <br />
         <button disabled={!faucetSimulation.data}
               onClick={() => writeContract(
                  faucetSimulation.data.request
               )}
         >
         Request more tokens
         </button>
         <hr />
         <h4>UserProxy access <Address address={proxyAddr} /></h4>
         <button onClick={deployUserProxy}>
         Deploy UserProxy (slow process)
         </button>
         <br /><br />
         <input type="text" placeholder="Or enter existing proxy address" value={newProxyAddr} onChange={proxyAddressChange} />
         <br /><br />
         <button 
            onClick={() => setProxyAddr(newProxyAddr)}
            disabled={newProxyAddr.match(/^0x[a-fA-F0-9]{40}$/) === null}
         >
            Set proxy address
         </button>
         <br /><br />
         { proxyAddr && (
            <>
               Proxy balance: {proxyBalanceAmount}
               <br />
               Proxy nonce: {nonce?.data?.toString() ?? "Loading..."}
               <br />
               <button disabled={!proxyAddr || proxyAddr === "Loading..." || nonce?.status !== 'success'} 
                  onClick={proxyFaucet}
               >
                  Request more tokens for proxy
               </button>
               <hr />
               <h4>Transfer tokens from proxy</h4>
               <ul>
                  <li> Token to transfer: <input type="text" placeholder="Token to transfer" value={transferToken} onChange={transferTokenChange} /> </li>
                  <li> Recipient address: <input type="text" placeholder="Recipient address" value={transferTo} onChange={transferToChange} /> </li>
                  <li> Amount to transfer: <input type="number" placeholder="Amount to transfer" value={transferAmount} onChange={transferAmountChange} /> </li>
               </ul>
               <button disabled={!proxyAddr || proxyAddr === "Loading..." || nonce?.status !== 'success'} 
                  onClick={proxyTransfer}
               >
                  Transfer
               </button>               
            </>
         )}   
         <hr />
         { txHash && (
            <>
               <h4>Last transaction:</h4>
               <a href={`https://eth-sepolia.blockscout.com/tx/${txHash}`} target="_blank">
                 {txHash}
               </a>
            </>
         )}
      </div>
    </>
  )
}

export {Token}