import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Navigate, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";
import { z } from "zod";

const schema = z.object({
  email: z.string().email("Email tidak valid").max(255),
  password: z.string().min(6, "Minimum 6 karakter").max(72),
});

const Auth = () => {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { document.title = "Login — TrustChain"; }, []);

  if (!loading && user) return <Navigate to="/admin" replace />;

  const handle = async (mode: "signin" | "signup") => {
    const p = schema.safeParse({ email, password });
    if (!p.success) { toast.error(p.error.issues[0].message); return; }
    setBusy(true);
    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email, password,
        options: { emailRedirectTo: window.location.origin + "/admin" },
      });
      if (error) toast.error(error.message);
      else { toast.success("Akun dibuat!", { description: "Cek email untuk verifikasi atau langsung login." }); }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) toast.error(error.message);
      else { toast.success("Login berhasil"); nav("/admin"); }
    }
    setBusy(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 gradient-glow pointer-events-none" />
      <Card className="w-full max-w-md p-8 shadow-elegant border-border/60 relative">
        <div className="flex flex-col items-center mb-6">
          <div className="h-12 w-12 rounded-2xl gradient-hero flex items-center justify-center shadow-glow mb-3">
            <ShieldCheck className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold">Admin TrustChain</h1>
          <p className="text-sm text-muted-foreground mt-1">Kelola campaign donasi</p>
        </div>
        <Tabs defaultValue="signin">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="signin">Login</TabsTrigger>
            <TabsTrigger value="signup">Daftar</TabsTrigger>
          </TabsList>
          {(["signin", "signup"] as const).map((m) => (
            <TabsContent key={m} value={m} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="anda@example.com" />
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••" />
              </div>
              <Button onClick={() => handle(m)} disabled={busy} className="w-full gradient-hero shadow-elegant border-0">
                {busy ? "Memproses…" : m === "signin" ? "Login" : "Daftar"}
              </Button>
            </TabsContent>
          ))}
        </Tabs>
        <p className="text-xs text-muted-foreground mt-6 text-center">
          Untuk role admin: daftar, lalu set role lewat Lovable Cloud.
        </p>
      </Card>
    </div>
  );
};

export default Auth;
