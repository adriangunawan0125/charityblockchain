import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/charity/Navbar";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DonateDialog } from "@/components/charity/DonateDialog";
import { ArrowLeft, ExternalLink, Wallet, FileText } from "lucide-react";
import { EXPLORER_ADDRESS, EXPLORER_TX, shortAddress } from "@/lib/chain";
import { formatDistanceToNow } from "date-fns";

type Campaign = {
  id: string; title: string; description: string; image_url: string | null;
  target_amount: number; wallet_address: string;
};
type Donation = { id: string; donor_address: string; amount: number; tx_hash: string; block_explorer_url: string; message: string | null; created_at: string };
type Report = { id: string; title: string; description: string | null; file_url: string; created_at: string };

const CampaignDetail = () => {
  const { id } = useParams();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [open, setOpen] = useState(false);

  const load = async () => {
    if (!id) return;
    const { data: c } = await supabase.from("campaigns").select("*").eq("id", id).maybeSingle();
    if (c) {
      setCampaign({ ...c, target_amount: Number(c.target_amount) } as Campaign);
      document.title = `${c.title} — TrustChain`;
    }
    const { data: ds } = await supabase.from("donations").select("*").eq("campaign_id", id).order("created_at", { ascending: false });
    setDonations((ds ?? []).map(d => ({ ...d, amount: Number(d.amount) })) as Donation[]);
    const { data: rs } = await supabase.from("reports").select("*").eq("campaign_id", id).order("created_at", { ascending: false });
    setReports(rs ?? []);
  };

  useEffect(() => { load(); }, [id]);

  if (!campaign) {
    return <div className="min-h-screen bg-background"><Navbar /><div className="container py-20 text-center text-muted-foreground">Memuat…</div></div>;
  }

  const raised = donations.reduce((a, d) => a + Number(d.amount), 0);
  const pct = Math.min(100, (raised / campaign.target_amount) * 100);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-8 max-w-5xl">
        <Button asChild variant="ghost" size="sm" className="mb-4 -ml-3">
          <Link to="/"><ArrowLeft className="h-4 w-4 mr-1" /> Kembali</Link>
        </Button>

        <div className="grid lg:grid-cols-5 gap-8">
          <div className="lg:col-span-3 space-y-6">
            <div className="aspect-[16/10] rounded-2xl overflow-hidden bg-muted shadow-card">
              {campaign.image_url ? (
                <img src={campaign.image_url} alt={campaign.title} className="h-full w-full object-cover" />
              ) : <div className="h-full w-full gradient-hero" />}
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{campaign.title}</h1>
              <p className="text-muted-foreground mt-4 leading-relaxed whitespace-pre-line">{campaign.description}</p>
            </div>
          </div>

          <aside className="lg:col-span-2 space-y-4">
            <Card className="p-6 shadow-elegant border-border/60 sticky top-24">
              <div className="space-y-4">
                <div>
                  <div className="text-3xl font-bold font-mono">{raised.toFixed(4)} <span className="text-base text-muted-foreground">MATIC</span></div>
                  <div className="text-sm text-muted-foreground">terkumpul dari target {campaign.target_amount} MATIC</div>
                </div>
                <Progress value={pct} className="h-3" />
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="p-3 rounded-lg bg-muted/50">
                    <div className="text-xl font-bold">{donations.length}</div>
                    <div className="text-xs text-muted-foreground">donatur</div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <div className="text-xl font-bold">{pct.toFixed(1)}%</div>
                    <div className="text-xs text-muted-foreground">tercapai</div>
                  </div>
                </div>
                <Button size="lg" onClick={() => setOpen(true)} className="w-full gradient-hero shadow-elegant border-0">
                  <Wallet className="h-4 w-4 mr-2" /> Donasi Sekarang
                </Button>
                <a href={EXPLORER_ADDRESS(campaign.wallet_address)} target="_blank" rel="noopener noreferrer"
                   className="text-xs font-mono text-muted-foreground hover:text-primary flex items-center justify-center gap-1 break-all">
                  {shortAddress(campaign.wallet_address)} <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </Card>
          </aside>
        </div>

        <Tabs defaultValue="donations" className="mt-12">
          <TabsList>
            <TabsTrigger value="donations">Donasi ({donations.length})</TabsTrigger>
            <TabsTrigger value="reports">Laporan ({reports.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="donations" className="mt-4">
            <Card className="border-border/60 divide-y divide-border">
              {donations.length === 0 && <div className="p-8 text-center text-muted-foreground">Jadilah donatur pertama!</div>}
              {donations.map((d) => (
                <div key={d.id} className="p-4 flex items-center justify-between gap-3 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-full gradient-hero flex items-center justify-center text-primary-foreground font-mono text-xs shrink-0">
                      {d.donor_address.slice(2, 4).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="font-mono text-sm truncate">{shortAddress(d.donor_address)}</div>
                      <div className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(d.created_at), { addSuffix: true })}</div>
                      {d.message && <div className="text-xs italic mt-1 text-muted-foreground line-clamp-1">"{d.message}"</div>}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-bold font-mono">{Number(d.amount).toFixed(4)} MATIC</div>
                    <a href={d.block_explorer_url} target="_blank" rel="noopener noreferrer"
                       className="text-xs text-primary hover:underline inline-flex items-center gap-1">
                      tx <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              ))}
            </Card>
          </TabsContent>
          <TabsContent value="reports" className="mt-4">
            <Card className="border-border/60 divide-y divide-border">
              {reports.length === 0 && <div className="p-8 text-center text-muted-foreground">Belum ada laporan dari admin.</div>}
              {reports.map((r) => (
                <div key={r.id} className="p-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-primary" />
                    <div>
                      <div className="font-medium">{r.title}</div>
                      {r.description && <div className="text-xs text-muted-foreground">{r.description}</div>}
                    </div>
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <a href={r.file_url} target="_blank" rel="noopener noreferrer">Lihat</a>
                  </Button>
                </div>
              ))}
            </Card>
          </TabsContent>
        </Tabs>

        <DonateDialog
          open={open}
          onOpenChange={setOpen}
          campaignId={campaign.id}
          recipientAddress={campaign.wallet_address}
          campaignTitle={campaign.title}
          onSuccess={load}
        />
      </div>
    </div>
  );
};

export default CampaignDetail;
