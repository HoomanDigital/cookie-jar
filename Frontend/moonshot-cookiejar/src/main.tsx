import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/globals.css";
import { WagmiProvider, createConfig } from "wagmi";
import { mainnet } from "wagmi/chains";
import { http } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@rainbow-me/rainbowkit/styles.css";
import { 
  getDefaultWallets, 
  RainbowKitProvider 
} from "@rainbow-me/rainbowkit";

const queryClient = new QueryClient();

const alchemyKey = import.meta.env.VITE_ALCHEMY_KEY;

const { connectors } = getDefaultWallets({
  appName: "Withdrawal Interface",
  projectId: import.meta.env.VITE_WALLET_CONNECT_PROJECT_ID,
});

const config = createConfig({
  chains: [mainnet],
  connectors,
  transports: {
    [mainnet.id]: http(`https://eth-mainnet.g.alchemy.com/v2/${alchemyKey}`),
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <App />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>
);