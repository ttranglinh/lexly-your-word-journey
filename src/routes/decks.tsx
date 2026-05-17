import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, ChevronDown, ChevronRight, Trash2, Library } from "lucide-react";
import { toast } from "sonner";
import { MobileLayout } from "@/components/MobileLayout";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/decks")({
  head: () => ({
    meta: [
      { title: "Decks — Lexly" },
      { name: "description", content: "Your saved vocabulary decks and word lists." },
    ],
  }),
  component: () => (
    <MobileLayout>
      <DecksScreen />
    </MobileLayout>
  ),
});

function DecksScreen() {
  const qc = useQueryClient();
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const decks = useQuery({
    queryKey: ["decks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("decks")
        .select("id, name, description, created_at, cards(count)")
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });

  const createDeck = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase.from("decks").insert({ name });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["decks"] });
      setNewName("");
      setCreating(false);
      toast.success("Deck created");
    },
  });

  const deleteDeck = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("decks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["decks"] });
      toast.success("Deck deleted");
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="font-serif text-2xl font-semibold">Your decks</h2>
          <p className="text-sm text-muted-foreground mt-1">Collections of words you're learning.</p>
        </div>
        <button
          onClick={() => setCreating((v) => !v)}
          className="inline-flex items-center gap-1 rounded-md bg-primary text-primary-foreground px-3 py-1.5 text-sm hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> New
        </button>
      </div>

      {creating && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (newName.trim()) createDeck.mutate(newName.trim());
          }}
          className="flex gap-2"
        >
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Deck name"
            className="flex-1 rounded-md border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40"
          />
          <button className="rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm">Create</button>
        </form>
      )}

      <div className="space-y-2">
        {decks.data?.map((d: { id: string; name: string; cards: { count: number }[] }) => {
          const count = d.cards?.[0]?.count ?? 0;
          const isOpen = expanded === d.id;
          return (
            <div key={d.id} className="rounded-lg border border-border bg-card overflow-hidden">
              <button
                onClick={() => setExpanded(isOpen ? null : d.id)}
                className="w-full flex items-center justify-between p-4 hover:bg-accent/30 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                  <div>
                    <p className="font-medium">{d.name}</p>
                    <p className="text-xs text-muted-foreground">{count} {count === 1 ? "card" : "cards"}</p>
                  </div>
                </div>
              </button>
              {isOpen && <DeckCards deckId={d.id} onDelete={() => deleteDeck.mutate(d.id)} />}
            </div>
          );
        })}
        {decks.data?.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <Library className="h-8 w-8 mx-auto opacity-30 mb-2" />
            <p className="text-sm">No decks yet. Create your first one.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function DeckCards({ deckId, onDelete }: { deckId: string; onDelete: () => void }) {
  const qc = useQueryClient();
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

  const removeCard = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("cards").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cards", deckId] }),
  });

  return (
    <div className="border-t border-border divide-y divide-border">
      {cards.data?.map((c) => (
        <div key={c.id} className="p-4 flex items-start justify-between gap-3 hover:bg-muted/30">
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <p className="font-serif font-semibold">{c.word}</p>
              {c.part_of_speech && <span className="text-xs text-primary">{c.part_of_speech}</span>}
            </div>
            {c.definition && <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{c.definition}</p>}
            {c.translation && <p className="text-sm mt-0.5">→ {c.translation}</p>}
          </div>
          <button onClick={() => removeCard.mutate(c.id)} className="text-muted-foreground hover:text-destructive p-1">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
      {cards.data?.length === 0 && (
        <p className="p-4 text-sm text-muted-foreground text-center">No cards yet — search a word to add one.</p>
      )}
      <div className="p-3 bg-muted/30">
        <button onClick={onDelete} className="text-xs text-destructive hover:underline">Delete deck</button>
      </div>
    </div>
  );
}
