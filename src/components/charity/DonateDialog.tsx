import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useWallet } from "@/hooks/useWallet";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Wallet, ExternalLink, Info } from "lucide-react";
import { EXPLORER_TX } from "@/lib/chain";
import { z } from "zod";

const schema = z.object({
  amount: z.number().positive("Jumlah harus > 0").max(10000, "Maksimum 10000 MATIC"),
  message: z.string().max(280, "Pesan maksimum 280 karakter").optional(),
});

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  campaignId: string;
  recipientAddress: string;
  campaignTitle: string;
  onSuccess: () => void;
};

export const DonateDialog = ({ open, onOpenChange, campaignId, recipientAddress, campaignTitle, onSuccess }: Props) => {
  const { address, connect, sendDonation } = useWallet();
  const { user } = useAuth();
  const [amount, setAmount] = useState("0.01");
  const [message, setMessage] = useState("");
  const [step, setStep] = useState<"form" | "pending" | "success">("form");
  const [txHash, setTxHash] = useState("");

  const reset = () => { setStep("form"); setTxHash(""); setAmount("0.01"); setMessage(""); };

  const handleDonate = async () => {
    const parsed = schema.safeParse({ amount: Number(amount), message: message || undefined });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message); return;
    }
    if (!address) { await connect(); return; }
    setStep("pending");
    try {
      const hash = await sendDonation(recipientAddress, parsed.data.amount.toString());
      setTxHash(hash);
      const { data: inserted, error } = await supabase.from("donations").insert({
        campaign_id: campaignId,
        donor_address: address.toLowerCase(),
        amount: parsed.data.amount,
        tx_hash: hash,
        block_explorer_url: EXPLORER_TX(hash),
        message: parsed.data.message ?? null,
        donor_user_id: (await supabase.auth.getUser()).data.user?.id ?? null,
      }).select("id").maybeSingle();
      if (error) console.error(error);
      setStep("success");
      toast.success("Donasi berhasil dikirim!", { description: "Tercatat di blockchain Polygon Amoy." });
      onSuccess();

      // Fire-and-forget on-chain verification (~12s confirm)
      if (inserted?.id) {
        setTimeout(() => {
          supabase.functions.invoke("verify-donation", { body: { donation_id: inserted.id } })
            .then(({ data }) => {
              if (data?.verified) toast.success("✓ Donasi terverifikasi on-chain");
            }).catch(() => {});
        }, 15000);
      }
    } catch (e: any) {
      console.error(e);
      toast.error("Transaksi gagal", { description: e?.shortMessage || e?.message || "Unknown error" });
      setStep("form");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="sm:max-w-md">
        {step === "form" && (
          <>
            <DialogHeader>
              <DialogTitle>Donasi untuk {campaignTitle}</DialogTitle>
              <DialogDescription>Donasi dikirim langsung dari wallet Anda ke wallet campaign di jaringan Polygon Amoy.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Jumlah (MATIC)</Label>
                <Input type="number" step="0.001" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} className="font-mono text-lg" />
                <div className="flex gap-2">
                  {["0.01", "0.1", "0.5", "1"].map((v) => (
                    <Button key={v} type="button" size="sm" variant="outline" onClick={() => setAmount(v)}>{v}</Button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Pesan (opsional)</Label>
                <Textarea maxLength={280} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Semoga bermanfaat…" />
              </div>
              {!user && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20 text-xs">
                  <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <p className="text-muted-foreground">
                    Belum login? <Link to="/auth" className="text-primary font-medium hover:underline">Daftar / Login</Link> dulu agar donasi tercatat di riwayat akun Anda dan bisa dilihat kapan saja.
                  </p>
                </div>
              )}
              <Button onClick={handleDonate} className="w-full gradient-hero shadow-elegant border-0" size="lg">
                <Wallet className="h-4 w-4 mr-2" />
                {address ? "Donasi Sekarang" : "Hubungkan Wallet"}
              </Button>
            </div>
          </>
        )}
        {step === "pending" && (
          <div className="py-12 flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <div className="text-center">
              <h3 className="font-semibold text-lg">Memproses transaksi…</h3>
              <p className="text-sm text-muted-foreground mt-1">Konfirmasi di MetaMask, lalu tunggu blockchain.</p>
            </div>
          </div>
        )}
        {step === "success" && (
          <div className="py-8 flex flex-col items-center gap-4 text-center">
            <div className="h-16 w-16 rounded-full bg-success/10 flex items-center justify-center">
              <div className="h-12 w-12 rounded-full bg-success flex items-center justify-center text-success-foreground text-2xl">✓</div>
            </div>
            <div>
              <h3 className="font-bold text-xl">Terima kasih! 💚</h3>
              <p className="text-sm text-muted-foreground mt-1">Donasi tercatat permanen di blockchain.</p>
            </div>
            <a href={EXPLORER_TX(txHash)} target="_blank" rel="noopener noreferrer"
               className="inline-flex items-center gap-1 text-sm font-mono text-primary hover:underline break-all px-4">
              {txHash.slice(0, 20)}…<ExternalLink className="h-3 w-3" />
            </a>
            <Button variant="outline" onClick={() => onOpenChange(false)} className="mt-2">Tutup</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
