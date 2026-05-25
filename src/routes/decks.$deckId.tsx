import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Volume2, Trash2, ChevronDown, Pencil, Layers, Type, ListChecks, Shuffle } from "lucide-react";
import { toast } from "sonner";
import { MobileLayout } from "@/components/MobileLayout";
import { supabase } from "@/integrations/supabase/client";
import { speak } from "@/lib/speak";

export const Route = createFileRoute("/decks/$deckId")({
  head: () => ({
    meta: [
      { title: "Deck — Lexly" },
      { name: "description", content: "Deck details and study modes." },
    ],
  }),
  component: () => (
    <MobileLayout>
      <DeckDetailScreen />
    </MobileLayout>
  ),
});

const MODES = [
  { id: "flashcard", label: "Flashcards", icon: Layers },
  { id: "writing", label: "Writing", icon: Type },
  { id: "mcq", label: "Multiple Choice", icon: ListChecks },
  { id: "matching", label: "Matching", icon: Shuffle },
] as const;

function DeckDetailScreen() {
  const { deckId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [open, setOpen] = useState<string | null>(null);

  const deck = useQuery({
    queryKey: ["deck", deckId],
    queryFn: async () => {
      const { data, error } = await supabase.from("decks").select("*").eq("id", deckId).single();
      if (error) throw error;
      return data;
    },
  });

  const cards = useQuery({
    queryKey: ["cards", deckId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cards")
        .select("*")
        .eq("deck_id", deckId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const deleteCard = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("cards").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cards", deckId] }),
  });

  const deleteDeck = useMutation({
    mutationFn: async () => {
      await supabase.from("cards").delete().eq("deck_id", deckId);
      const { error } = await supabase.from("decks").delete().eq("id", deckId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["decks"] });
      toast.success("Deck deleted");
      navigate({ to: "/decks" });
    },
  });

  const count = cards.data?.length ?? 0;
  const due = Math.min(count, Math.ceil(count * 0.3));

  return (
    <div className="space-y-6">
      <Link to="/decks" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> All Decks
      </Link>

      <header>
        <h2 className="font-serif text-3xl font-semibold">{deck.data?.name ?? "…"}</h2>
        <p className="text-sm text-muted-foreground mt-1">{count} words · {due} due</p>
      </header>

      <section>
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">Study mode</p>
        <div className="grid grid-cols-2 gap-2">
          {MODES.map(({ id, label, icon: Icon }) => (
            <Link
              key={id}
              to="/study/$deckId/$mode"
              params={{ deckId, mode: id }}
              className="group rounded-xl border border-border bg-card p-4 hover:border-primary hover:bg-accent/20 transition-colors"
            >
              <Icon className="h-5 w-5 text-primary mb-2" strokeWidth={1.75} />
              <p className="font-medium text-sm">{label}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5 group-hover:text-primary">Start →</p>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">Words</p>
        <div className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden">
          {cards.data?.map((c) => {
            const isOpen = open === c.id;
            return (
              <div key={c.id}>
                <button
                  onClick={() => setOpen(isOpen ? null : c.id)}
                  className="w-full p-4 flex items-center justify-between gap-3 hover:bg-accent/20 text-left transition-colors"
                >
                  <div className="flex items-baseline gap-2 min-w-0">
                    <span className="font-serif font-semibold truncate">{c.word}</span>
                    {c.part_of_speech && (
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        {c.part_of_speech.charAt(0)}.
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground shrink-0">
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => { e.stopPropagation(); speak(c.word); }}
                      className="p-1 hover:text-primary"
                    >
                      <Volume2 className="h-3.5 w-3.5" />
                    </span>
                    <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                  </div>
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 space-y-2 bg-muted/30">
                    {c.definition && <p className="text-sm">{c.definition}</p>}
                    {c.translation && <p className="text-sm text-muted-foreground">→ {c.translation}</p>}
                    {c.example && <p className="text-sm font-serif italic text-muted-foreground">"{c.example}"</p>}
                    <button
                      onClick={() => deleteCard.mutate(c.id)}
                      className="inline-flex items-center gap-1 text-xs text-destructive hover:underline pt-1"
                    >
                      <Trash2 className="h-3 w-3" /> Remove
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          {cards.data?.length === 0 && (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No words yet.{" "}
              <Link to="/lookup" className="text-primary hover:underline">Look up a word</Link> to add one.
            </div>
          )}
        </div>
      </section>

      <button
        onClick={() => {
          if (confirm("Delete this deck and all its words?")) deleteDeck.mutate();
        }}
        className="text-xs text-destructive hover:underline inline-flex items-center gap-1"
      >
        <Pencil className="h-3 w-3" /> Delete deck
      </button>
    </div>
  );
}
