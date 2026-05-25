import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, ChevronRight, Library, Search } from "lucide-react";
import { toast } from "sonner";
import { MobileLayout } from "@/components/MobileLayout";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/decks")({
  head: () => ({
    meta: [
      { title: "Decks — Lexly" },
      { name: "description", content: "Your saved vocabulary decks." },
    ],
  }),
  component: () => (
    <MobileLayout>
      <DecksScreen />
    </MobileLayout>
  ),
});

type DeckRow = { id: string; name: string; cards: { count: number }[] };

function DecksScreen() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");

  const decks = useQuery({
    queryKey: ["decks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("decks")
        .select("id, name, created_at, cards(count)")
        .order("created_at");
      if (error) throw error;
      return data as DeckRow[];
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

  const filtered = (decks.data ?? []).filter((d) => d.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="font-serif text-3xl font-semibold">All Decks</h2>
          <p className="text-sm text-muted-foreground mt-1">{decks.data?.length ?? 0} collections</p>
        </div>
        <button
          onClick={() => setCreating((v) => !v)}
          className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-3 py-1.5 text-sm hover:bg-accent/30"
        >
          <Plus className="h-3.5 w-3.5" /> New
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search decks or words"
          className="w-full rounded-md border border-border bg-card pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40"
        />
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

      <div>
        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 px-2 pb-2 text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border">
          <span>Deck</span>
          <span className="text-right w-14">Words</span>
          <span className="text-right w-10">Due</span>
          <span className="w-4" />
        </div>
        <div className="divide-y divide-border">
          {filtered.map((d) => {
            const count = d.cards?.[0]?.count ?? 0;
            const due = Math.min(count, Math.ceil(count * 0.3));
            const progress = count > 0 ? Math.round(((count - due) / count) * 100) : 0;
            return (
              <Link
                key={d.id}
                to="/decks/$deckId"
                params={{ deckId: d.id }}
                className="grid grid-cols-[1fr_auto_auto_auto] gap-3 items-center px-2 py-3.5 hover:bg-accent/20 transition-colors"
              >
                <div className="min-w-0">
                  <p className="font-medium truncate">{d.name}</p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="h-1 flex-1 max-w-[120px] rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${progress}%` }} />
                    </div>
                    <span className="text-[10px] text-muted-foreground">{progress}%</span>
                  </div>
                </div>
                <span className="text-sm text-muted-foreground tabular-nums w-14 text-right">{count}</span>
                <span className={`text-sm tabular-nums w-10 text-right ${due > 0 ? "text-primary font-medium" : "text-muted-foreground"}`}>
                  {due > 0 ? due : "—"}
                </span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            );
          })}
        </div>

        {decks.data?.length === 0 && (
          <button
            onClick={() => setCreating(true)}
            className="mt-6 w-full rounded-xl border-2 border-dashed border-border text-muted-foreground py-10 hover:border-primary hover:text-primary transition-colors flex flex-col items-center gap-2"
          >
            <Library className="h-6 w-6 opacity-50" />
            <span className="text-sm">Create a new deck</span>
          </button>
        )}
      </div>
    </div>
  );
}
