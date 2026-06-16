import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/hooks/useWallet";
import { useAuth } from "@/hooks/useAuth";
import { shortAddress } from "@/lib/chain";
import { Wallet, Shield, LogOut, ShieldCheck, User, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Navbar = () => {
  const { address, connect, disconnect, connecting, balance } = useWallet();
  const { user, isAdmin } = useAuth();
  const nav = useNavigate();

  const signOut = async () => {
    await supabase.auth.signOut();
    toast.success("Berhasil logout");
    nav("/");
  };

  return (
    <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/70 border-b border-border/50">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="h-9 w-9 rounded-xl gradient-hero shadow-glow flex items-center justify-center transition-transform group-hover:scale-110">
            <ShieldCheck className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="font-bold text-lg tracking-tight">
            Trust<span className="text-gradient">Chain</span>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">Campaigns</Link>
          <Link to="/stats" className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
            <BarChart3 className="h-4 w-4" /> Statistik
          </Link>
          {user && (
            <Link to="/profile" className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
              <User className="h-4 w-4" /> Profil
            </Link>
          )}
          {isAdmin && (
            <Link to="/admin" className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
              <Shield className="h-4 w-4" /> Admin
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-2">
          {address ? (
            <Button variant="outline" onClick={disconnect} className="gap-2 font-mono text-xs">
              <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
              {balance && <span className="hidden sm:inline">{balance} MATIC</span>}
              {shortAddress(address)}
            </Button>
          ) : (
            <Button onClick={connect} disabled={connecting} variant="default" className="gap-2 gradient-hero shadow-elegant border-0">
              <Wallet className="h-4 w-4" />
              {connecting ? "Menghubungkan…" : "Connect Wallet"}
            </Button>
          )}
          {user ? (
            <Button variant="ghost" size="icon" onClick={signOut} title="Logout">
              <LogOut className="h-4 w-4" />
            </Button>
          ) : (
            <Button variant="ghost" onClick={() => nav("/auth")}>Login / Daftar</Button>
          )}
        </div>
      </div>
    </header>
  );
};
