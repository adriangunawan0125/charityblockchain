import { useEffect, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/charity/Navbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ExternalLink, Heart, Award, Save } from "lucide-react";
import { EXPLORER_TX, shortAddress } from "@/lib/chain";
import { formatDistanceToNow } from "date-fns";

const Profile = () => {
  const { user, loading } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [donations, setDonations] = useState<any[]>([]);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatar, setAvatar] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { document.title = "Profil — TrustChain"; }, []);
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: p } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      if (p) { setProfile(p); setDisplayName(p.display_name ?? ""); setBio(p.bio ?? ""); setAvatar(p.avatar_url ?? ""); }
      const { data: d } = await supabase
        .from("donations")
        .select("*")
        .eq("donor_user_id", user.id)
        .order("created_at", { ascending: false });
      const cids = Array.from(new Set((d ?? []).map((x) => x.campaign_id)));
      let cmap: Record<string, { id: string; title: string }> = {};
      if (cids.length) {
        const { data: cs } = await supabase.from("campaigns").select("id, title").in("id", cids);
        cmap = Object.fromEntries((cs ?? []).map((c) => [c.id, c]));
      }
      setDonations((d ?? []).map((x) => ({ ...x, campaigns: cmap[x.campaign_id] })));
    })();
  }, [user]);

  if (loading) return <div className="min-h-screen bg-background"><Navbar /><div className="container py-20 text-center">Memuat…</div></div>;
  if (!user) return <Navigate to="/auth" replace />;

  const total = donations.reduce((a, d) => a + Number(d.amount), 0);
  const verifiedCount = donations.filter((d) => d.verified).length;
  const badge =
    total >= 10 ? { label: "Whale Donatur", color: "bg-gradient-to-r from-amber-500 to-orange-500" } :
    total >= 1 ? { label: "Big Supporter", color: "bg-gradient-to-r from-primary to-primary-glow" } :
    total >= 0.1 ? { label: "Active Donor", color: "bg-gradient-to-r from-secondary to-accent" } :
    { label: "Newcomer", color: "bg-muted text-foreground" };

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      display_name: displayName.trim() || null,
      bio: bio.trim() || null,
      avatar_url: avatar.trim() || null,
    }).eq("id", user.id);
    setSaving(false);
    if (error) toast.error(error.message); else toast.success("Profil tersimpan");
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-10 max-w-5xl">
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="p-6 md:col-span-1 space-y-4">
            <div className="flex flex-col items-center text-center">
              <div className="h-24 w-24 rounded-full overflow-hidden gradient-hero flex items-center justify-center text-3xl font-bold text-primary-foreground shadow-elegant">
                {avatar ? <img src={avatar} className="h-full w-full object-cover" alt="" /> : (displayName || user.email || "U").charAt(0).toUpperCase()}
              </div>
              <div className="mt-3 font-bold text-lg">{displayName || user.email?.split("@")[0]}</div>
              <div className="text-xs text-muted-foreground">{user.email}</div>
              <Badge className={`mt-3 ${badge.color} border-0 text-white`}>
                <Award className="h-3 w-3 mr-1" /> {badge.label}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="text-xl font-bold font-mono">{total.toFixed(4)}</div>
                <div className="text-xs text-muted-foreground">MATIC</div>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="text-xl font-bold">{donations.length}</div>
                <div className="text-xs text-muted-foreground">donasi</div>
              </div>
            </div>
            <div className="text-xs text-center text-muted-foreground">
              {verifiedCount}/{donations.length} terverifikasi on-chain
            </div>
          </Card>

          <Card className="p-6 md:col-span-2 space-y-4">
            <h2 className="font-bold text-lg">Edit Profil</h2>
            <div className="space-y-2"><Label>Nama Tampilan</Label><Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} /></div>
            <div className="space-y-2"><Label>URL Avatar</Label><Input value={avatar} onChange={(e) => setAvatar(e.target.value)} placeholder="https://…" /></div>
            <div className="space-y-2"><Label>Bio</Label><Textarea rows={3} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Ceritakan tentang Anda…" /></div>
            <Button onClick={save} disabled={saving} className="gradient-hero shadow-elegant border-0">
              <Save className="h-4 w-4 mr-1" /> {saving ? "Menyimpan…" : "Simpan"}
            </Button>
          </Card>
        </div>

        <div className="mt-10">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2"><Heart className="h-5 w-5 text-primary" /> Riwayat Donasi</h2>
          {donations.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">Belum ada donasi. <Link to="/" className="text-primary hover:underline">Lihat campaign</Link></Card>
          ) : (
            <Card className="divide-y divide-border">
              {donations.map((d) => (
                <div key={d.id} className="p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <Link to={`/campaign/${d.campaigns?.id}`} className="font-medium hover:text-primary line-clamp-1">{d.campaigns?.title ?? "Campaign"}</Link>
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      {formatDistanceToNow(new Date(d.created_at), { addSuffix: true })}
                      {d.verified && <Badge variant="outline" className="text-success border-success/50 text-[10px] py-0">✓ verified</Badge>}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-bold font-mono">{Number(d.amount).toFixed(4)} MATIC</div>
                    <a href={d.block_explorer_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline inline-flex items-center gap-1">
                      {shortAddress(d.tx_hash)} <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              ))}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;