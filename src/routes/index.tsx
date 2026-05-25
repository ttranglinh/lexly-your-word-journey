import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search, Library, ArrowRight, Flame } from "lucide-react";
import { MobileLayout } from "@/components/MobileLayout";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Lexly — Learn vocabulary, calmly" },
      { name: "description", content: "A minimalist vocabulary app for daily word study." },
    ],
  }),
  component: () => (
    <MobileLayout>
      <HomeScreen />
    </MobileLayout>
  ),
});

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function HomeScreen() {
  const stats = useQuery({
    queryKey: ["home-stats"],
    queryFn: async () => {
      const [decksRes, cardsRes] = await Promise.all([
        supabase.from("decks").select("id", { count: "exact", head: true }),
        supabase.from("cards").select("id", { count: "exact", head: true }),
      ]);
      return { decks: decksRes.count ?? 0, cards: cardsRes.count ?? 0 };
    },
  });

  const firstDeck = useQuery({
    queryKey: ["first-deck"],
    queryFn: async () => {
      const { data } = await supabase.from("decks").select("id, name").order("created_at").limit(1).maybeSingle();
      return data;
    },
  });

  const due = Math.min(stats.data?.cards ?? 0, 14);

  return (
    <div className="space-y-8">
      <section>
        <p className="text-sm text-muted-foreground">{greeting()},</p>
        <h2 className="font-serif text-3xl font-semibold mt-0.5">Linh</h2>
      </section>

      <section className="rounded-2xl bg-accent/60 border border-accent p-6 space-y-4">
        <p className="text-[11px] uppercase tracking-[0.14em] text-primary/80 font-medium">Up next</p>
        <div className="flex items-baseline gap-2">
          <span className="font-serif text-5xl font-semibold text-foreground">{due}</span>
          <span className="text-muted-foreground">words</span>
        </div>
        <p className="text-sm text-muted-foreground">Ready to review today.</p>
        {firstDeck.data ? (
          <Link
            to="/decks/$deckId"
            params={{ deckId: firstDeck.data.id }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium shadow-sm hover:bg-primary/90"
          >
            Begin <ArrowRight className="h-4 w-4" />
          </Link>
        ) : (
          <Link
            to="/decks"
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium shadow-sm"
          >
            Create your first deck <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </section>

      <section className="grid grid-cols-2 gap-3">
        <Link
          to="/lookup"
          className="rounded-xl border border-border bg-card p-4 hover:bg-accent/30 transition-colors group"
        >
          <Search className="h-5 w-5 text-primary mb-3" />
          <p className="font-medium text-sm">Look up a word</p>
          <p className="text-xs text-muted-foreground mt-0.5">Search the dictionary</p>
        </Link>
        <Link
          to="/decks"
          className="rounded-xl border border-border bg-card p-4 hover:bg-accent/30 transition-colors"
        >
          <Library className="h-5 w-5 text-primary mb-3" />
          <p className="font-medium text-sm">Browse decks</p>
          <p className="text-xs text-muted-foreground mt-0.5">{stats.data?.decks ?? 0} decks</p>
        </Link>
      </section>

      <section className="flex items-center gap-2 text-xs text-muted-foreground pt-2">
        <Flame className="h-3.5 w-3.5 text-primary" />
        <span><span className="text-foreground font-medium">7-day streak</span> · {stats.data?.cards ?? 0} words saved</span>
      </section>
    </div>
  );
}
