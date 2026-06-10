import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/charity/Navbar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Users, Wallet, Trophy, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { shortAddress } from "@/lib/chain";

const Stats = () => {
  const [donations, setDonations] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);

  useEffect(() => {
    document.title = "Statistik Publik — TrustChain";
    (async () => {
      const { data: d } = await supabase.from("donations").select("amount, donor_address, created_at, verified");
      const { data: c } = await supabase.from("campaigns").select("id, title, status");
      setDonations(d ?? []);
      setCampaigns(c ?? []);
    })();
  }, []);

  const total = donations.reduce((a, d) => a + Number(d.amount), 0);
  const uniqueDonors = new Set(donations.map((d) => d.donor_address.toLowerCase())).size;
  const verified = donations.filter((d) => d.verified).length;
  const verifiedPct = donations.length ? (verified / donations.length) * 100 : 0;

  // Leaderboard
  const board = Object.values(
    donations.reduce((acc: Record<string, { addr: string; total: number; count: number }>, d) => {
      const k = d.donor_address.toLowerCase();
      acc[k] = acc[k] ?? { addr: k, total: 0, count: 0 };
      acc[k].total += Number(d.amount);
      acc[k].count += 1;
      return acc;
    }, {})
  ).sort((a, b) => b.total - a.total).slice(0, 10);

  // Daily series (last 14 days)
  const days: { date: string; total: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const day = new Date(); day.setDate(day.getDate() - i); day.setHours(0, 0, 0, 0);
    const next = new Date(day); next.setDate(next.getDate() + 1);
    const sum = donations
      .filter((d) => { const t = new Date(d.created_at).getTime(); return t >= day.getTime() && t < next.getTime(); })
      .reduce((a, d) => a + Number(d.amount), 0);
    days.push({ date: day.toLocaleDateString("id-ID", { day: "2-digit", month: "short" }), total: sum });
  }
  const maxDay = Math.max(...days.map((d) => d.total), 0.0001);

  const stats = [
    { icon: Wallet, label: "Total Terkumpul", value: `${total.toFixed(4)} MATIC` },
    { icon: TrendingUp, label: "Total Donasi", value: donations.length },
    { icon: Users, label: "Donatur Unik", value: uniqueDonors },
    { icon: ShieldCheck, label: "On-Chain Verified", value: `${verifiedPct.toFixed(0)}%` },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-10 max-w-6xl">
        <div className="text-center mb-10">
          <Badge variant="outline" className="mb-3">Transparansi Penuh</Badge>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight">Statistik Platform</h1>
          <p className="text-muted-foreground mt-2">Semua angka dihitung langsung dari blockchain — tidak ada yang disembunyikan.</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {stats.map((s) => (
            <Card key={s.label} className="p-6 text-center shadow-card">
              <div className="h-10 w-10 mx-auto rounded-lg gradient-hero flex items-center justify-center mb-3">
                <s.icon className="h-5 w-5 text-primary-foreground" />
              </div>
              <div className="text-2xl font-bold font-mono">{s.value}</div>
              <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
            </Card>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <h2 className="font-bold mb-4 flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" /> Donasi 14 Hari Terakhir</h2>
            <div className="flex items-end gap-1 h-40">
              {days.map((d) => (
                <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group">
                  <div className="text-[10px] font-mono text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">{d.total.toFixed(2)}</div>
                  <div className="w-full gradient-hero rounded-t transition-all hover:opacity-80" style={{ height: `${(d.total / maxDay) * 100}%`, minHeight: d.total > 0 ? "4px" : "0" }} />
                </div>
              ))}
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground mt-2">
              <span>{days[0]?.date}</span>
              <span>{days[days.length - 1]?.date}</span>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="font-bold mb-4 flex items-center gap-2"><Trophy className="h-4 w-4 text-amber-500" /> Top 10 Donatur</h2>
            {board.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-8">Belum ada donasi.</div>
            ) : (
              <ol className="space-y-2">
                {board.map((b, i) => (
                  <li key={b.addr} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? "bg-amber-500 text-white" : i === 1 ? "bg-slate-400 text-white" : i === 2 ? "bg-amber-700 text-white" : "bg-muted"}`}>{i + 1}</div>
                      <span className="font-mono text-sm truncate">{shortAddress(b.addr)}</span>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-bold font-mono text-sm">{b.total.toFixed(4)}</div>
                      <div className="text-[10px] text-muted-foreground">{b.count}x</div>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>

        <div className="mt-8 text-center text-sm text-muted-foreground">
          {campaigns.length} campaign aktif · <Link to="/" className="text-primary hover:underline">Lihat semua</Link>
        </div>
      </div>
    </div>
  );
};

export default Stats;