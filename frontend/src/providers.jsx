import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider, darkTheme, lightTheme } from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";
import { wagmiConfig, arcTestnet } from "./config/wagmi.js";
import { useTheme } from "./hooks/useTheme.js";

// Created once, outside the component, so it is never rebuilt on re-render.
const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 15_000, refetchOnWindowFocus: false } },
});

export function Providers({ children }) {
  const { theme } = useTheme();
  const rkTheme =
    theme === "light"
      ? lightTheme({ accentColor: "#0fa86f", borderRadius: "medium" })
      : darkTheme({ accentColor: "#3ee0a1", accentColorForeground: "#04120c", borderRadius: "medium" });

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={rkTheme} initialChain={arcTestnet}>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
