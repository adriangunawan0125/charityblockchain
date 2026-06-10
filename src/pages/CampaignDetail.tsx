import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/charity/Navbar";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DonateDialog } from "@/components/charity/DonateDialog";
import { ArrowLeft, ExternalLink, Wallet, FileText, MessageSquare, Megaphone, ShieldCheck, Send, Trash2 } from "lucide-react";
import { EXPLORER_ADDRESS, EXPLORER_TX, shortAddress } from "@/lib/chain";
import { formatDistanceToNow } from "date-fns";
import { getCategory } from "@/lib/categories";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

type Campaign = {
  id: string; title: string; description: string; image_url: string | null;
  target_amount: number; wallet_address: string; category?: string;
};
type Donation = { id: string; donor_address: string; amount: number; tx_hash: string; block_explorer_url: string; message: string | null; created_at: string; verified: boolean };
type Report = { id: string; title: string; description: string | null; file_url: string; created_at: string };
type Comment = { id: string; user_id: string; content: string; created_at: string; profile?: { display_name: string | null; avatar_url: string | null } };
type Update = { id: string; title: string; content: string; created_at: string };

const CampaignDetail = () => {
  const { id } = useParams();
  const { user, isAdmin } = useAuth();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [updates, setUpdates] = useState<Update[]>([]);
  const [commentText, setCommentText] = useState("");
  const [updTitle, setUpdTitle] = useState("");
  const [updContent, setUpdContent] = useState("");
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
    const { data: cms } = await supabase.from("campaign_comments").select("*").eq("campaign_id", id).order("created_at", { ascending: false });
    const userIds = Array.from(new Set((cms ?? []).map((c) => c.user_id)));
    let profMap: Record<string, { display_name: string | null; avatar_url: string | null }> = {};
    if (userIds.length) {
      const { data: profs } = await supabase.from("profiles").select("id, display_name, avatar_url").in("id", userIds);
      profMap = Object.fromEntries((profs ?? []).map((p) => [p.id, { display_name: p.display_name, avatar_url: p.avatar_url }]));
    }
    setComments((cms ?? []).map((c) => ({ ...c, profile: profMap[c.user_id] })) as Comment[]);
    const { data: ups } = await supabase.from("campaign_updates").select("*").eq("campaign_id", id).order("created_at", { ascending: false });
    setUpdates(ups ?? []);
  };

  useEffect(() => { load(); }, [id]);

  // Realtime: donations + comments
  useEffect(() => {
    if (!id) return;
    const ch = supabase
      .channel(`campaign:${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "donations", filter: `campaign_id=eq.${id}` }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "campaign_comments", filter: `campaign_id=eq.${id}` }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "campaign_updates", filter: `campaign_id=eq.${id}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!campaign) {
    return <div className="min-h-screen bg-background"><Navbar /><div className="container py-20 text-center text-muted-foreground">Memuat…</div></div>;
  }

  const raised = donations.reduce((a, d) => a + Number(d.amount), 0);
  const pct = Math.min(100, (raised / campaign.target_amount) * 100);
  const cat = getCategory(campaign.category ?? "umum");

  const postComment = async () => {
    if (!user) { toast.error("Login dulu untuk komentar"); return; }
    const txt = commentText.trim();
    if (!txt) return;
    const { error } = await supabase.from("campaign_comments").insert({ campaign_id: campaign.id, user_id: user.id, content: txt });
    if (error) toast.error(error.message); else { setCommentText(""); }
  };
  const deleteComment = async (cid: string) => {
    const { error } = await supabase.from("campaign_comments").delete().eq("id", cid);
    if (error) toast.error(error.message);
  };
  const postUpdate = async () => {
    if (!updTitle.trim() || !updContent.trim()) { toast.error("Judul & isi wajib"); return; }
    const { error } = await supabase.from("campaign_updates").insert({ campaign_id: campaign.id, title: updTitle.trim(), content: updContent.trim(), created_by: user?.id });
    if (error) toast.error(error.message); else { setUpdTitle(""); setUpdContent(""); toast.success("Update dipublikasi"); }
  };

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
              <Badge variant="outline" className="mb-2">{cat.emoji} {cat.label}</Badge>
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
            <TabsTrigger value="updates">Update ({updates.length})</TabsTrigger>
            <TabsTrigger value="comments">Komentar ({comments.length})</TabsTrigger>
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
                      <div className="font-mono text-sm truncate flex items-center gap-1.5">
                        {shortAddress(d.donor_address)}
                        {d.verified && <Badge variant="outline" className="text-success border-success/50 text-[10px] py-0 px-1.5 gap-0.5"><ShieldCheck className="h-2.5 w-2.5" /> verified</Badge>}
                      </div>
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

          <TabsContent value="updates" className="mt-4 space-y-3">
            {isAdmin && (
              <Card className="p-4 space-y-2 border-primary/30">
                <div className="text-sm font-medium flex items-center gap-2"><Megaphone className="h-4 w-4 text-primary" /> Posting Update (Admin)</div>
                <input className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm" placeholder="Judul update…" value={updTitle} onChange={(e) => setUpdTitle(e.target.value)} />
                <Textarea rows={3} placeholder="Apa progress terbaru?" value={updContent} onChange={(e) => setUpdContent(e.target.value)} />
                <Button size="sm" onClick={postUpdate} className="gradient-hero shadow-elegant border-0"><Send className="h-3 w-3 mr-1" /> Publikasi</Button>
              </Card>
            )}
            {updates.length === 0 && <Card className="p-8 text-center text-muted-foreground">Belum ada update.</Card>}
            {updates.map((u) => (
              <Card key={u.id} className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-semibold">{u.title}</div>
                  <div className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(u.created_at), { addSuffix: true })}</div>
                </div>
                <p className="text-sm text-muted-foreground whitespace-pre-line">{u.content}</p>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="comments" className="mt-4 space-y-3">
            {user ? (
              <Card className="p-4 space-y-2">
                <div className="text-sm font-medium flex items-center gap-2"><MessageSquare className="h-4 w-4 text-primary" /> Tulis dukungan</div>
                <Textarea rows={2} maxLength={500} placeholder="Tulis pesan dukungan…" value={commentText} onChange={(e) => setCommentText(e.target.value)} />
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">{commentText.length}/500</span>
                  <Button size="sm" onClick={postComment} className="gradient-hero shadow-elegant border-0"><Send className="h-3 w-3 mr-1" /> Kirim</Button>
                </div>
              </Card>
            ) : (
              <Card className="p-4 text-center text-sm text-muted-foreground"><Link to="/auth" className="text-primary hover:underline">Login</Link> untuk meninggalkan komentar.</Card>
            )}
            {comments.length === 0 && <Card className="p-8 text-center text-muted-foreground">Belum ada komentar.</Card>}
            {comments.map((c) => (
              <Card key={c.id} className="p-4 flex gap-3">
                <div className="h-9 w-9 rounded-full overflow-hidden gradient-hero flex items-center justify-center text-primary-foreground font-bold text-xs shrink-0">
                  {c.profile?.avatar_url ? <img src={c.profile.avatar_url} alt="" className="h-full w-full object-cover" /> : (c.profile?.display_name ?? "U").charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium text-sm">{c.profile?.display_name ?? "Donatur"}</div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}</span>
                      {(user?.id === c.user_id || isAdmin) && (
                        <button onClick={() => deleteComment(c.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3 w-3" /></button>
                      )}
                    </div>
                  </div>
                  <p className="text-sm mt-1 whitespace-pre-line">{c.content}</p>
                </div>
              </Card>
            ))}
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
