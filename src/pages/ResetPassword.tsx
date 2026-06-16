import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { KeyRound } from "lucide-react";

const ResetPassword = () => {
  const nav = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => { document.title = "Reset Password — TrustChain"; }, []);

  useEffect(() => {
    // Supabase recovery link sets a session via the URL hash automatically.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => { if (data.session) setReady(true); });
    return () => sub.subscription.unsubscribe();
  }, []);

  const submit = async () => {
    if (password.length < 6) return toast.error("Password minimal 6 karakter");
    if (password !== confirm) return toast.error("Konfirmasi password tidak cocok");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Password berhasil diubah");
    await supabase.auth.signOut();
    nav("/auth");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 gradient-glow pointer-events-none" />
      <Card className="w-full max-w-md p-8 shadow-elegant border-border/60 relative">
        <div className="flex flex-col items-center mb-6">
          <div className="h-12 w-12 rounded-2xl gradient-hero flex items-center justify-center shadow-glow mb-3">
            <KeyRound className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold">Reset Password</h1>
          <p className="text-sm text-muted-foreground mt-1 text-center">
            {ready ? "Masukkan password baru Anda" : "Memverifikasi link reset…"}
          </p>
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Password Baru</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••" />
          </div>
          <div className="space-y-2">
            <Label>Konfirmasi Password</Label>
            <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="••••••" />
          </div>
          <Button onClick={submit} disabled={busy || !ready} className="w-full gradient-hero shadow-elegant border-0">
            {busy ? "Menyimpan…" : "Ubah Password"}
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default ResetPassword;