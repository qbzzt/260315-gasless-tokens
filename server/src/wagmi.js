import { http, webSocket, createConfig, fallback } from 'wagmi'
import { sepolia } from 'wagmi/chains'
import { injected } from 'wagmi/connectors'

export const config = createConfig({
  chains: [sepolia],
  connectors: [
    injected(),
  ],
  transports: {
    [sepolia.id]: fallback([
      webSocket("wss://ethereum-sepolia-rpc.publicnode.com"), 
      http("https://ethereum-sepolia.gateway.tatum.io")
    ]),
  },
  multiInjectedProviderDiscovery: false,
})

