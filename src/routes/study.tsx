import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { GraduationCap, ChevronRight } from "lucide-react";
import { MobileLayout } from "@/components/MobileLayout";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/study")({
  head: () => ({
    meta: [
      { title: "Study — Lexly" },
      { name: "description", content: "Pick a deck to study." },
    ],
  }),
  component: () => (
    <MobileLayout>
      <StudyPicker />
    </MobileLayout>
  ),
});

function StudyPicker() {
  const decks = useQuery({
    queryKey: ["decks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("decks")
        .select("id, name, cards(count)")
        .order("created_at");
      if (error) throw error;
      return data as { id: string; name: string; cards: { count: number }[] }[];
    },
  });

  return (
    <div className="space-y-6">
      <header>
        <h2 className="font-serif text-3xl font-semibold">Study</h2>
        <p className="text-sm text-muted-foreground mt-1">Pick a deck to begin.</p>
      </header>

      <div className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden">
        {decks.data?.map((d) => (
          <Link
            key={d.id}
            to="/decks/$deckId"
            params={{ deckId: d.id }}
            className="flex items-center justify-between p-4 hover:bg-accent/20 transition-colors"
          >
            <div>
              <p className="font-medium">{d.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{d.cards?.[0]?.count ?? 0} words</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        ))}
        {decks.data?.length === 0 && (
          <div className="p-10 text-center text-sm text-muted-foreground">
            <GraduationCap className="h-8 w-8 mx-auto opacity-30 mb-2" />
            No decks yet.
          </div>
        )}
      </div>
    </div>
  );
}
