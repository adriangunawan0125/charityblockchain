import { Link } from "react-router-dom";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Users, Target, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getCategory } from "@/lib/categories";

export type Campaign = {
  id: string;
  title: string;
  description: string;
  image_url: string | null;
  target_amount: number;
  category?: string;
  raised?: number;
  donor_count?: number;
};

export const CampaignCard = ({ c }: { c: Campaign }) => {
  const raised = c.raised ?? 0;
  const pct = Math.min(100, (raised / Number(c.target_amount)) * 100);
  const cat = getCategory(c.category ?? "umum");
  return (
    <Card className="group overflow-hidden border-border/60 shadow-card hover:shadow-elegant transition-all duration-500 hover:-translate-y-1 bg-card">
      <div className="relative h-48 overflow-hidden bg-muted">
        {c.image_url ? (
          <img src={c.image_url} alt={c.title} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" loading="lazy" />
        ) : (
          <div className="h-full w-full gradient-hero" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
        <Badge className="absolute top-3 left-3 bg-background/90 text-foreground backdrop-blur border-0 shadow-card">
          {cat.emoji} {cat.label}
        </Badge>
      </div>
      <CardContent className="p-6 space-y-3">
        <h3 className="font-bold text-lg leading-tight line-clamp-2 group-hover:text-primary transition-colors">{c.title}</h3>
        <p className="text-sm text-muted-foreground line-clamp-2">{c.description}</p>
        <div className="space-y-2 pt-2">
          <div className="flex justify-between text-xs font-medium">
            <span className="text-muted-foreground">Terkumpul</span>
            <span className="font-mono">{raised.toFixed(4)} / {Number(c.target_amount).toFixed(2)} MATIC</span>
          </div>
          <Progress value={pct} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground pt-1">
            <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {c.donor_count ?? 0} donatur</span>
            <span className="flex items-center gap-1"><Target className="h-3 w-3" /> {pct.toFixed(1)}%</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="p-6 pt-0">
        <Button asChild variant="outline" className="w-full group/btn">
          <Link to={`/campaign/${c.id}`}>
            Lihat Detail
            <ArrowRight className="h-4 w-4 ml-1 transition-transform group-hover/btn:translate-x-1" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
};
