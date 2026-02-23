import { 
          useState, 
          useEffect,
          useCallback, 
        } from 'react'
import {  useChainId, 
          useAccount,
          useReadContract, 
          useWriteContract,
          useWatchContractEvent,
          useSignTypedData,
          useSimulateContract
        } from 'wagmi'

// This is an ERC-20 that includes a faucet() function to get you some tokens for testing.
let faucetABI = [
   {
      "inputs":[
         {
            "internalType":"address",
            "name":"spender",
            "type":"address"
         },
         {
            "internalType":"uint256",
            "name":"allowance",
            "type":"uint256"
         },
         {
            "internalType":"uint256",
            "name":"needed",
            "type":"uint256"
         }
      ],
      "name":"ERC20InsufficientAllowance",
      "type":"error"
   },
   {
      "inputs":[
         {
            "internalType":"address",
            "name":"sender",
            "type":"address"
         },
         {
            "internalType":"uint256",
            "name":"balance",
            "type":"uint256"
         },
         {
            "internalType":"uint256",
            "name":"needed",
            "type":"uint256"
         }
      ],
      "name":"ERC20InsufficientBalance",
      "type":"error"
   },
   {
      "inputs":[
         {
            "internalType":"address",
            "name":"approver",
            "type":"address"
         }
      ],
      "name":"ERC20InvalidApprover",
      "type":"error"
   },
   {
      "inputs":[
         {
            "internalType":"address",
            "name":"receiver",
            "type":"address"
         }
      ],
      "name":"ERC20InvalidReceiver",
      "type":"error"
   },
   {
      "inputs":[
         {
            "internalType":"address",
            "name":"sender",
            "type":"address"
         }
      ],
      "name":"ERC20InvalidSender",
      "type":"error"
   },
   {
      "inputs":[
         {
            "internalType":"address",
            "name":"spender",
            "type":"address"
         }
      ],
      "name":"ERC20InvalidSpender",
      "type":"error"
   },
   {
      "anonymous":false,
      "inputs":[
         {
            "indexed":true,
            "internalType":"address",
            "name":"owner",
            "type":"address"
         },
         {
            "indexed":true,
            "internalType":"address",
            "name":"spender",
            "type":"address"
         },
         {
            "indexed":false,
            "internalType":"uint256",
            "name":"value",
            "type":"uint256"
         }
      ],
      "name":"Approval",
      "type":"event"
   },
   {
      "anonymous":false,
      "inputs":[
         {
            "indexed":true,
            "internalType":"address",
            "name":"from",
            "type":"address"
         },
         {
            "indexed":true,
            "internalType":"address",
            "name":"to",
            "type":"address"
         },
         {
            "indexed":false,
            "internalType":"uint256",
            "name":"value",
            "type":"uint256"
         }
      ],
      "name":"Transfer",
      "type":"event"
   },
   {
      "inputs":[
         {
            "internalType":"address",
            "name":"owner",
            "type":"address"
         },
         {
            "internalType":"address",
            "name":"spender",
            "type":"address"
         }
      ],
      "name":"allowance",
      "outputs":[
         {
            "internalType":"uint256",
            "name":"",
            "type":"uint256"
         }
      ],
      "stateMutability":"view",
      "type":"function"
   },
   {
      "inputs":[
         {
            "internalType":"address",
            "name":"spender",
            "type":"address"
         },
         {
            "internalType":"uint256",
            "name":"value",
            "type":"uint256"
         }
      ],
      "name":"approve",
      "outputs":[
         {
            "internalType":"bool",
            "name":"",
            "type":"bool"
         }
      ],
      "stateMutability":"nonpayable",
      "type":"function"
   },
   {
      "inputs":[
         {
            "internalType":"address",
            "name":"account",
            "type":"address"
         }
      ],
      "name":"balanceOf",
      "outputs":[
         {
            "internalType":"uint256",
            "name":"",
            "type":"uint256"
         }
      ],
      "stateMutability":"view",
      "type":"function"
   },
   {
      "inputs":[
         
      ],
      "name":"decimals",
      "outputs":[
         {
            "internalType":"uint8",
            "name":"",
            "type":"uint8"
         }
      ],
      "stateMutability":"view",
      "type":"function"
   },
   {
      "inputs":[
         
      ],
      "name":"faucet",
      "outputs":[
         
      ],
      "stateMutability":"nonpayable",
      "type":"function"
   },
   {
      "inputs":[
         
      ],
      "name":"name",
      "outputs":[
         {
            "internalType":"string",
            "name":"",
            "type":"string"
         }
      ],
      "stateMutability":"view",
      "type":"function"
   },
   {
      "inputs":[
         {
            "internalType":"address",
            "name":"to",
            "type":"address"
         },
         {
            "internalType":"uint256",
            "name":"value",
            "type":"uint256"
         }
      ],
      "name":"transfer",
      "outputs":[
         {
            "internalType":"bool",
            "name":"",
            "type":"bool"
         }
      ],
      "stateMutability":"nonpayable",
      "type":"function"
   },
   {
      "inputs":[
         {
            "internalType":"address",
            "name":"from",
            "type":"address"
         },
         {
            "internalType":"address",
            "name":"to",
            "type":"address"
         },
         {
            "internalType":"uint256",
            "name":"value",
            "type":"uint256"
         }
      ],
      "name":"transferFrom",
      "outputs":[
         {
            "internalType":"bool",
            "name":"",
            "type":"bool"
         }
      ],
      "stateMutability":"nonpayable",
      "type":"function"
   }
]   // faucetABI



const faucetAddrs = {
  // Sepolia
    11155111: '0x4cBedDEDA88fDd9e116618a5cD71BB0E440C2A78'
}

/*
const useSponsoredGreeting = ({ contractAddr, chainId }) => {
  const { address: account } = useAccount()

  const { signTypedDataAsync } = useSignTypedData()

  const signGreeting = useCallback(
    async (greeting) => {
      if (!account) throw new Error("Wallet not connected")

      const domain = {
        name: "Greeter",
        version: "1",
        chainId,
        verifyingContract: contractAddr,
      }

      const types = {
        GreetingRequest: [
          { name: "greeting", type: "string" },
        ],
      }

      const message = { greeting }

      const signature = await signTypedDataAsync({
        domain,
        types,
        primaryType: "GreetingRequest",
        message,
      })

      const r = `0x${signature.slice(2, 66)}`
      const s = `0x${signature.slice(66, 130)}`
      const v = parseInt(signature.slice(130, 132), 16)

      return {
        req: { greeting },
        v,
        r,
        s,
      }
    },
    [account, chainId, contractAddr, signTypedDataAsync],
  )

  return { signGreeting }
}
*/

const Faucet = () => {  
  const chainId = useChainId()
  const account = useAccount()

  const faucetAddr = chainId && faucetAddrs[chainId] 

  const balance = useReadContract({
    address: faucetAddr,
    abi: faucetABI,
    functionName: 'balanceOf',
    args: account?.address ? [account.address] : undefined,   // wagmi v3 requires undefined until ready
    query: {
      enabled: Boolean(account?.address),             // don't run until wallet connected
    },
  })

  const [ balanceAmount, setBalanceAmount ] = useState("Loading...")
  const [ proxyAddr, setProxyAddr ] = useState(null)

  useEffect(() => {
    if (balance?.status === "success")
      setBalanceAmount(balance.data / 10n**18n)
    else
      setBalanceAmount("Loading...")  
  }, [balance])

  /*
  const [ currentGreeting, setCurrentGreeting ] = 
    useState("Loading...")
  const [ newGreeting, setNewGreeting ] = useState("")
  const [ lastSetterAddress, setLastSetterAddress ] = useState("")

  if (greeterAddr) {
    useWatchContractEvent({
      address: greeterAddr,
      abi: greeterABI,
      eventName: 'SetGreeting',
      chainId,
      onLogs(logs) {
        const greetingFromContract = logs[0].args.greeting
        setCurrentGreeting(greetingFromContract)
        setLastSetterAddress(logs[0].args.sender)
      },
    })
  }

  const greetingChange = (evt) =>
    setNewGreeting(evt.target.value)

  const canUpdateGreeting =
    greeterAddr &&
    account &&
    newGreeting.trim().length > 0
  
    */
  const { writeContract } = useWriteContract()

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


  const faucetSimulation = useSimulateContract({
    address: faucetAddr,
    abi: faucetABI,
    functionName: 'faucet',
    account: account.address    
  })

  return (
    <>
      <h2>Faucet</h2>
      <h4>Direct access (as {account?.address})</h4>
      Your balance: {balanceAmount} FCT
      <hr />      
      <br />
      <button disabled={!faucetSimulation.data}
              onClick={() => writeContract(
                faucetSimulation.data.request
              )}
      >
        Request tokens
      </button>
      <h4>Gasless access</h4>
      Proxy address: {proxyAddr ? proxyAddr : "Not deployed yet"}
      <button onClick={deployUserProxy}>
        Deploy UserProxy (slow process)
      </button>
    </>
  )
}



export {Faucet}