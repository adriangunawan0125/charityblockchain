// Polygon Amoy Testnet config
export const AMOY_CHAIN = {
  chainId: "0x13882", // 80002
  chainName: "Polygon Amoy Testnet",
  nativeCurrency: { name: "MATIC", symbol: "MATIC", decimals: 18 },
  rpcUrls: ["https://rpc-amoy.polygon.technology"],
  blockExplorerUrls: ["https://amoy.polygonscan.com"],
};

export const EXPLORER_TX = (hash: string) => `${AMOY_CHAIN.blockExplorerUrls[0]}/tx/${hash}`;
export const EXPLORER_ADDRESS = (addr: string) => `${AMOY_CHAIN.blockExplorerUrls[0]}/address/${addr}`;
export const shortAddress = (a: string) => a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "";
