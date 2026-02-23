import express from "express";
import { createServer as createViteServer } from "vite";
import { createWalletClient, createPublicClient, http } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { sepolia } from 'viem/chains'
import 'dotenv/config'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)

const UserProxy = require('../contracts/out/UserProxy.sol/UserProxy.json')

const sepoliaAccount = privateKeyToAccount(process.env.PRIVATE_KEY)

const sepoliaClient = createWalletClient({
  account: sepoliaAccount,
  chain: sepolia,
  transport: http("https://rpc.sentio.xyz/sepolia"),
})

const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(),
})

const start = async () => {
  const app = express()

  app.use(express.json())

  app.post("/server/deploy", async (req, res) => {
    try {
      const ownerAddress = req.body.ownerAddress

      const txHash = await sepoliaClient.deployContract({
        abi: UserProxy.abi,
        bytecode: UserProxy.bytecode.object,
        args: [ownerAddress],
        account: sepoliaAccount,
      })

      console.log("Deployment transaction hash:", txHash)

      const receipt = await publicClient.waitForTransactionReceipt({
        hash: txHash,
      })

      res.json({ contractAddress: receipt.contractAddress })
    } catch (err) {
      console.error(err)
      res.status(500).json({ error: err.message })
    }
  })

  // Let Vite handle everything else
  const vite = await createViteServer({
    server: { middlewareMode: true }
  })

  app.use(vite.middlewares)

  app.listen(5173, () => {
    console.log("Dev server running on http://localhost:5173");
  })
}

start()

