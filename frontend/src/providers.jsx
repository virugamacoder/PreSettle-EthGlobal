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
      ? lightTheme({ accentColor: "#29bd35", accentColorForeground: "#000009", borderRadius: "large", fontStack: "system" })
      : darkTheme({ accentColor: "#57db63", accentColorForeground: "#000009", borderRadius: "large", fontStack: "system" });

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
