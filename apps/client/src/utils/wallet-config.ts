import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { avalancheFuji } from "wagmi/chains";

export const config = getDefaultConfig({
  appName: "ShardsofAffinity",
  projectId: "SOA",
  chains: [avalancheFuji],
});
