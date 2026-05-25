import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Flame, BookOpen, Library, Target } from "lucide-react";
import { MobileLayout } from "@/components/MobileLayout";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/stats")({
  head: () => ({
    meta: [
      { title: "Stats — Lexly" },
      { name: "description", content: "Your learning progress." },
    ],
  }),
  component: () => (
    <MobileLayout>
      <StatsScreen />
    </MobileLayout>
  ),
});

function StatsScreen() {
  const stats = useQuery({
    queryKey: ["stats"],
    queryFn: async () => {
      const [d, c] = await Promise.all([
        supabase.from("decks").select("id", { count: "exact", head: true }),
        supabase.from("cards").select("id", { count: "exact", head: true }),
      ]);
      return { decks: d.count ?? 0, cards: c.count ?? 0 };
    },
  });

  const items = [
    { label: "Words saved", value: stats.data?.cards ?? 0, icon: BookOpen },
    { label: "Decks", value: stats.data?.decks ?? 0, icon: Library },
    { label: "Day streak", value: 7, icon: Flame },
    { label: "Accuracy", value: "—", icon: Target },
  ];

  return (
    <div className="space-y-6">
      <header>
        <h2 className="font-serif text-3xl font-semibold">Stats</h2>
        <p className="text-sm text-muted-foreground mt-1">A quiet look at your progress.</p>
      </header>

      <div className="grid grid-cols-2 gap-3">
        {items.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-xl border border-border bg-card p-4">
            <Icon className="h-4 w-4 text-primary mb-3" />
            <p className="font-serif text-3xl font-semibold">{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{label}</p>
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground text-center pt-6">
        Detailed session history coming soon.
      </p>
    </div>
  );
}
