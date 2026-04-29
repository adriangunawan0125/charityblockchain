import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/charity/Navbar";
import { CampaignCard, type Campaign } from "@/components/charity/CampaignCard";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Shield, Eye, Link2, Zap } from "lucide-react";

const Index = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "TrustChain — Donasi Transparan di Blockchain";
    const meta = document.querySelector('meta[name="description"]') || (() => {
      const m = document.createElement("meta"); m.setAttribute("name", "description"); document.head.appendChild(m); return m;
    })();
    meta.setAttribute("content", "Platform donasi Web3 transparan. Setiap rupiah tercatat di blockchain Polygon, dapat diverifikasi siapa saja.");
    load();
  }, []);

  const load = async () => {
    const { data: cs } = await supabase.from("campaigns").select("*").eq("status", "active").order("created_at", { ascending: false });
    if (cs) {
      const enriched = await Promise.all(cs.map(async (c) => {
        const { data: dons } = await supabase.from("donations").select("amount").eq("campaign_id", c.id);
        const raised = dons?.reduce((a, d) => a + Number(d.amount), 0) ?? 0;
        return { ...c, target_amount: Number(c.target_amount), raised, donor_count: dons?.length ?? 0 };
      }));
      setCampaigns(enriched as Campaign[]);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-glow pointer-events-none" />
        <div className="container py-20 md:py-32 relative">
          <div className="max-w-3xl mx-auto text-center space-y-6 animate-fade-in-up">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-border bg-card/50 backdrop-blur text-xs font-medium text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
              Live di Polygon Amoy Testnet
            </div>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05]">
              Donasi yang <span className="text-gradient">benar-benar</span><br/>transparan.
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              Setiap donasi tercatat permanen di blockchain. Tidak ada yang bisa memanipulasi, semua orang bisa memverifikasi.
            </p>
            <div className="flex flex-wrap gap-3 justify-center pt-4">
              <Button asChild size="lg" className="gradient-hero shadow-elegant border-0 text-base">
                <a href="#campaigns">Lihat Campaign</a>
              </Button>
              <Button asChild size="lg" variant="outline" className="text-base">
                <Link to="/auth">Sebagai Admin</Link>
              </Button>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mt-20 max-w-4xl mx-auto">
            {[
              { icon: Eye, t: "100% Transparan", d: "Semua transaksi public di Polygonscan." },
              { icon: Link2, t: "On-Chain Permanen", d: "Data tidak dapat diubah, tanpa perantara." },
              { icon: Zap, t: "Instant & Murah", d: "Polygon: <$0.01 per transaksi." },
            ].map((f) => (
              <div key={f.t} className="p-6 rounded-2xl border border-border bg-card shadow-card hover:shadow-elegant transition-shadow">
                <div className="h-10 w-10 rounded-lg gradient-hero flex items-center justify-center mb-4">
                  <f.icon className="h-5 w-5 text-primary-foreground" />
                </div>
                <h3 className="font-semibold mb-1">{f.t}</h3>
                <p className="text-sm text-muted-foreground">{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Campaigns */}
      <section id="campaigns" className="container py-20">
        <div className="flex items-end justify-between mb-10">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Campaign Aktif</h2>
            <p className="text-muted-foreground mt-2">Pilih campaign yang ingin Anda dukung.</p>
          </div>
        </div>

        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1,2,3].map(i => <div key={i} className="h-96 rounded-2xl bg-muted animate-pulse" />)}
          </div>
        ) : campaigns.length === 0 ? (
          <div className="text-center py-20 border border-dashed rounded-2xl">
            <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Belum ada campaign. Login sebagai admin untuk membuat.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {campaigns.map((c) => <CampaignCard key={c.id} c={c} />)}
          </div>
        )}
      </section>

      <footer className="border-t border-border py-8 mt-10">
        <div className="container text-center text-sm text-muted-foreground">
          TrustChain · Built on Polygon · Open & Verifiable
        </div>
      </footer>
    </div>
  );
};

export default Index;
