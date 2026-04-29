import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useWallet } from "@/hooks/useWallet";
import { Navbar } from "@/components/charity/Navbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, ExternalLink, Wallet, FileUp, Trash2, ShieldAlert } from "lucide-react";
import { EXPLORER_ADDRESS, shortAddress } from "@/lib/chain";
import { z } from "zod";

const campaignSchema = z.object({
  title: z.string().trim().min(3, "Judul minimum 3 karakter").max(120),
  description: z.string().trim().min(10, "Deskripsi minimum 10 karakter").max(5000),
  image_url: z.string().url("URL gambar tidak valid").max(500).optional().or(z.literal("")),
  target_amount: z.number().positive("Target harus > 0").max(1000000),
  wallet_address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Address Ethereum tidak valid"),
});

const Admin = () => {
  const { user, isAdmin, loading } = useAuth();
  const { address } = useWallet();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [reportFor, setReportFor] = useState<string | null>(null);

  // form
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [img, setImg] = useState("");
  const [target, setTarget] = useState("1");
  const [wallet, setWallet] = useState("");

  useEffect(() => { document.title = "Admin — TrustChain"; load(); }, []);
  useEffect(() => { if (address && !wallet) setWallet(address); }, [address, wallet]);

  const load = async () => {
    const { data } = await supabase.from("campaigns").select("*").order("created_at", { ascending: false });
    if (!data) return;
    const enriched = await Promise.all(data.map(async (c) => {
      const { data: d } = await supabase.from("donations").select("amount").eq("campaign_id", c.id);
      return { ...c, raised: d?.reduce((a, x) => a + Number(x.amount), 0) ?? 0, donor_count: d?.length ?? 0 };
    }));
    setCampaigns(enriched);
  };

  if (loading) return <div className="min-h-screen bg-background"><Navbar /><div className="container py-20 text-center">Memuat…</div></div>;
  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) return (
    <div className="min-h-screen bg-background"><Navbar />
      <div className="container py-20 max-w-md text-center">
        <ShieldAlert className="h-12 w-12 mx-auto text-destructive mb-3" />
        <h2 className="text-xl font-bold">Bukan Admin</h2>
        <p className="text-muted-foreground mt-2 text-sm">Akun Anda belum punya role admin. Buka <strong>Lovable Cloud → Database → user_roles</strong> dan tambahkan role <code>admin</code> untuk user_id Anda: <code className="text-xs">{user.id}</code></p>
      </div>
    </div>
  );

  const create = async () => {
    const parsed = campaignSchema.safeParse({
      title, description: desc, image_url: img, target_amount: Number(target), wallet_address: wallet,
    });
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    const { error } = await supabase.from("campaigns").insert({
      title: parsed.data.title,
      description: parsed.data.description,
      image_url: parsed.data.image_url || null,
      target_amount: parsed.data.target_amount,
      wallet_address: parsed.data.wallet_address.toLowerCase(),
      created_by: user.id,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Campaign dibuat!");
    setOpen(false); setTitle(""); setDesc(""); setImg(""); setTarget("1");
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Hapus campaign ini? Donasi tetap ada di blockchain.")) return;
    const { error } = await supabase.from("campaigns").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Dihapus"); load(); }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-10 max-w-6xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Dashboard Admin</h1>
            <p className="text-muted-foreground mt-1 text-sm">Kelola campaign & laporan penggunaan dana.</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-hero shadow-elegant border-0"><Plus className="h-4 w-4 mr-1" /> Campaign Baru</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader><DialogTitle>Buat Campaign Baru</DialogTitle></DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2"><Label>Judul</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
                <div className="space-y-2"><Label>Deskripsi</Label><Textarea rows={4} value={desc} onChange={(e) => setDesc(e.target.value)} /></div>
                <div className="space-y-2"><Label>URL Gambar (opsional)</Label><Input value={img} onChange={(e) => setImg(e.target.value)} placeholder="https://…" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2"><Label>Target (MATIC)</Label><Input type="number" step="0.01" value={target} onChange={(e) => setTarget(e.target.value)} /></div>
                  <div className="space-y-2">
                    <Label>Wallet Penerima</Label>
                    <div className="flex gap-1">
                      <Input value={wallet} onChange={(e) => setWallet(e.target.value)} placeholder="0x…" className="font-mono text-xs" />
                      {address && <Button type="button" variant="outline" size="icon" onClick={() => setWallet(address)} title="Pakai wallet saya"><Wallet className="h-4 w-4" /></Button>}
                    </div>
                  </div>
                </div>
                <Button onClick={create} className="w-full gradient-hero shadow-elegant border-0">Buat Campaign</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="campaigns">
          <TabsList>
            <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
            <TabsTrigger value="how">Cara Withdraw</TabsTrigger>
          </TabsList>

          <TabsContent value="campaigns" className="mt-4 space-y-3">
            {campaigns.length === 0 && <Card className="p-8 text-center text-muted-foreground">Belum ada campaign. Klik "Campaign Baru".</Card>}
            {campaigns.map((c) => (
              <Card key={c.id} className="p-5 flex flex-col md:flex-row md:items-center gap-4">
                <div className="h-16 w-16 rounded-lg overflow-hidden bg-muted shrink-0">
                  {c.image_url ? <img src={c.image_url} className="h-full w-full object-cover" alt="" /> : <div className="h-full w-full gradient-hero" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{c.title}</div>
                  <div className="text-sm text-muted-foreground">
                    <span className="font-mono">{c.raised.toFixed(4)} / {Number(c.target_amount).toFixed(2)} MATIC</span> · {c.donor_count} donatur
                  </div>
                  <a href={EXPLORER_ADDRESS(c.wallet_address)} target="_blank" rel="noopener noreferrer"
                     className="text-xs font-mono text-primary inline-flex items-center gap-1 hover:underline">
                    {shortAddress(c.wallet_address)} <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <div className="flex gap-2">
                  <ReportUploader campaignId={c.id} onDone={load} />
                  <Button variant="outline" size="sm" onClick={() => remove(c.id)} className="text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="how" className="mt-4">
            <Card className="p-6 space-y-3 text-sm">
              <h3 className="font-semibold text-base">💰 Withdraw Dana</h3>
              <p className="text-muted-foreground">Karena setiap campaign punya wallet penerima sendiri, dana donasi langsung masuk ke wallet tersebut on-chain. Tidak perlu withdraw — Anda sudah memegang kontrol penuh.</p>
              <ol className="list-decimal pl-5 space-y-1 text-muted-foreground">
                <li>Buka MetaMask, switch ke Polygon Amoy.</li>
                <li>Cek saldo wallet campaign Anda.</li>
                <li>Transfer ke exchange / wallet lain seperti biasa.</li>
                <li>Upload laporan penggunaan dana untuk transparansi publik.</li>
              </ol>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

const ReportUploader = ({ campaignId, onDone }: { campaignId: string; onDone: () => void }) => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const upload = async () => {
    if (!file) { toast.error("Pilih file dulu"); return; }
    if (!title.trim()) { toast.error("Judul wajib"); return; }
    setBusy(true);
    const path = `${campaignId}/${Date.now()}-${file.name}`;
    const { error: upErr } = await supabase.storage.from("reports").upload(path, file);
    if (upErr) { toast.error(upErr.message); setBusy(false); return; }
    const { data: pub } = supabase.storage.from("reports").getPublicUrl(path);
    const { error } = await supabase.from("reports").insert({
      campaign_id: campaignId, title: title.trim(), description: desc.trim() || null, file_url: pub.publicUrl,
    });
    if (error) toast.error(error.message);
    else { toast.success("Laporan diupload"); setOpen(false); setTitle(""); setDesc(""); setFile(null); onDone(); }
    setBusy(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant="outline" size="sm"><FileUp className="h-4 w-4 mr-1" />Laporan</Button></DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Upload Laporan Penggunaan Dana</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-2"><Label>Judul</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div className="space-y-2"><Label>Deskripsi</Label><Textarea value={desc} onChange={(e) => setDesc(e.target.value)} /></div>
          <div className="space-y-2"><Label>File (PDF/Gambar)</Label><Input type="file" accept=".pdf,image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></div>
          <Button onClick={upload} disabled={busy} className="w-full gradient-hero shadow-elegant border-0">{busy ? "Mengupload…" : "Upload"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default Admin;
