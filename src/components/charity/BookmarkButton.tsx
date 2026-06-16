import { useEffect, useState } from "react";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

type Props = {
  campaignId: string;
  variant?: "icon" | "full";
  className?: string;
};

export const BookmarkButton = ({ campaignId, variant = "icon", className }: Props) => {
  const { user } = useAuth();
  const nav = useNavigate();
  const [active, setActive] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) { setActive(false); return; }
    (async () => {
      const { data } = await supabase
        .from("campaign_bookmarks")
        .select("id")
        .eq("user_id", user.id)
        .eq("campaign_id", campaignId)
        .maybeSingle();
      setActive(!!data);
    })();
  }, [user, campaignId]);

  const toggle = async (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (!user) {
      toast.info("Login dulu untuk menyimpan campaign");
      nav("/auth");
      return;
    }
    setBusy(true);
    if (active) {
      const { error } = await supabase
        .from("campaign_bookmarks")
        .delete()
        .eq("user_id", user.id)
        .eq("campaign_id", campaignId);
      if (!error) { setActive(false); toast.success("Bookmark dihapus"); }
      else toast.error(error.message);
    } else {
      const { error } = await supabase
        .from("campaign_bookmarks")
        .insert({ user_id: user.id, campaign_id: campaignId });
      if (!error) { setActive(true); toast.success("Disimpan ke bookmark"); }
      else toast.error(error.message);
    }
    setBusy(false);
  };

  if (variant === "full") {
    return (
      <Button
        type="button"
        onClick={toggle}
        disabled={busy}
        variant={active ? "default" : "outline"}
        className={className}
      >
        {active ? <BookmarkCheck className="h-4 w-4 mr-1" /> : <Bookmark className="h-4 w-4 mr-1" />}
        {active ? "Tersimpan" : "Simpan"}
      </Button>
    );
  }

  return (
    <Button
      type="button"
      size="icon"
      variant="secondary"
      onClick={toggle}
      disabled={busy}
      className={`h-8 w-8 backdrop-blur bg-background/80 hover:bg-background ${className ?? ""}`}
      aria-label={active ? "Hapus bookmark" : "Bookmark campaign"}
      title={active ? "Hapus bookmark" : "Bookmark campaign"}
    >
      {active
        ? <BookmarkCheck className="h-4 w-4 text-primary" />
        : <Bookmark className="h-4 w-4" />}
    </Button>
  );
};