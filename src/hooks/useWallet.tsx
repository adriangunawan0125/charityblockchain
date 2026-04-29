import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import { BrowserProvider, formatEther, parseEther } from "ethers";
import { AMOY_CHAIN } from "@/lib/chain";
import { toast } from "sonner";

declare global {
  interface Window { ethereum?: any }
}

type WalletCtx = {
  address: string | null;
  chainId: string | null;
  balance: string | null;
  connecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  ensureAmoy: () => Promise<boolean>;
  sendDonation: (to: string, amountMatic: string) => Promise<string>; // returns tx hash
  refreshBalance: () => Promise<void>;
};

const Ctx = createContext<WalletCtx | null>(null);

export const WalletProvider = ({ children }: { children: ReactNode }) => {
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  const refreshBalance = useCallback(async () => {
    if (!window.ethereum || !address) return;
    try {
      const provider = new BrowserProvider(window.ethereum);
      const bal = await provider.getBalance(address);
      setBalance(parseFloat(formatEther(bal)).toFixed(4));
    } catch {}
  }, [address]);

  const ensureAmoy = useCallback(async () => {
    if (!window.ethereum) return false;
    try {
      const current = await window.ethereum.request({ method: "eth_chainId" });
      if (current === AMOY_CHAIN.chainId) return true;
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: AMOY_CHAIN.chainId }],
        });
      } catch (err: any) {
        if (err.code === 4902) {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [AMOY_CHAIN],
          });
        } else { throw err; }
      }
      return true;
    } catch (e: any) {
      toast.error("Gagal switch jaringan", { description: e?.message });
      return false;
    }
  }, []);

  const connect = useCallback(async () => {
    if (!window.ethereum) {
      toast.error("MetaMask tidak ditemukan", {
        description: "Install ekstensi MetaMask terlebih dahulu.",
      });
      window.open("https://metamask.io/download/", "_blank");
      return;
    }
    setConnecting(true);
    try {
      const accounts: string[] = await window.ethereum.request({ method: "eth_requestAccounts" });
      if (accounts[0]) {
        setAddress(accounts[0]);
        const cid = await window.ethereum.request({ method: "eth_chainId" });
        setChainId(cid);
        await ensureAmoy();
        toast.success("Wallet terhubung", { description: accounts[0] });
      }
    } catch (e: any) {
      toast.error("Gagal connect", { description: e?.message });
    } finally {
      setConnecting(false);
    }
  }, [ensureAmoy]);

  const disconnect = useCallback(() => {
    setAddress(null); setBalance(null); setChainId(null);
  }, []);

  const sendDonation = useCallback(async (to: string, amountMatic: string) => {
    if (!window.ethereum || !address) throw new Error("Wallet belum terhubung");
    const ok = await ensureAmoy();
    if (!ok) throw new Error("Harus pakai jaringan Polygon Amoy");
    const provider = new BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const tx = await signer.sendTransaction({
      to,
      value: parseEther(amountMatic),
    });
    return tx.hash;
  }, [address, ensureAmoy]);

  useEffect(() => {
    if (!window.ethereum) return;
    const onAccounts = (accs: string[]) => setAddress(accs[0] ?? null);
    const onChain = (cid: string) => setChainId(cid);
    window.ethereum.on?.("accountsChanged", onAccounts);
    window.ethereum.on?.("chainChanged", onChain);
    // restore
    window.ethereum.request({ method: "eth_accounts" }).then((a: string[]) => {
      if (a[0]) {
        setAddress(a[0]);
        window.ethereum.request({ method: "eth_chainId" }).then(setChainId);
      }
    });
    return () => {
      window.ethereum.removeListener?.("accountsChanged", onAccounts);
      window.ethereum.removeListener?.("chainChanged", onChain);
    };
  }, []);

  useEffect(() => { refreshBalance(); }, [address, chainId, refreshBalance]);

  return (
    <Ctx.Provider value={{ address, chainId, balance, connecting, connect, disconnect, ensureAmoy, sendDonation, refreshBalance }}>
      {children}
    </Ctx.Provider>
  );
};

export const useWallet = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useWallet must be used within WalletProvider");
  return c;
};
