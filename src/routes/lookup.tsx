import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, ArrowLeft, Volume2, Loader2, Check, Plus } from "lucide-react";
import { toast } from "sonner";
import { MobileLayout } from "@/components/MobileLayout";
import { lookupWord, type WordResult } from "@/lib/dictionary";
import { speak } from "@/lib/speak";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/lookup")({
  head: () => ({
    meta: [
      { title: "Look up — Lexly" },
      { name: "description", content: "Search any English word and save it to a deck." },
    ],
  }),
  component: () => (
    <MobileLayout>
      <LookupScreen />
    </MobileLayout>
  ),
});

function LookupScreen() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [result, setResult] = useState<WordResult | null>(null);
  const [selectedDeck, setSelectedDeck] = useState<string>("");
  const [showNewDeck, setShowNewDeck] = useState(false);
  const [newDeckName, setNewDeckName] = useState("");
  const [savedFlash, setSavedFlash] = useState(false);

  const decks = useQuery({
    queryKey: ["decks-min"],
    queryFn: async () => {
      const { data, error } = await supabase.from("decks").select("id, name").order("created_at");
      if (error) throw error;
      return data;
    },
  });

  const lookup = useMutation({
    mutationFn: lookupWord,
    onSuccess: setResult,
    onError: (e: Error) => toast.error(e.message),
  });

  const createDeck = useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase.from("decks").insert({ name }).select("id, name").single();
      if (error) throw error;
      return data;
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ["decks-min"] });
      qc.invalidateQueries({ queryKey: ["decks"] });
      setSelectedDeck(d.id);
      setShowNewDeck(false);
      setNewDeckName("");
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!result || !selectedDeck) throw new Error("Pick a deck");
      const { error } = await supabase.from("cards").insert({
        deck_id: selectedDeck,
        word: result.word,
        definition: result.definition,
        translation: result.translation,
        part_of_speech: result.partOfSpeech,
        example: result.example,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cards"] });
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1500);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-5 pb-32">
      <Link to="/" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Home
      </Link>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (q.trim()) lookup.mutate(q);
        }}
        className="relative"
      >
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Look up a word"
          className="w-full rounded-full border border-border bg-card pl-11 pr-4 py-3 text-base outline-none focus:ring-2 focus:ring-ring/40"
        />
      </form>

      {lookup.isPending && (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      )}

      {result && !lookup.isPending && (
        <article className="rounded-2xl border border-border bg-card p-6 space-y-5">
          <header className="space-y-2">
            <h2 className="font-serif text-4xl font-semibold tracking-tight">{result.word}</h2>
            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={() => speak(result.word)}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
              >
                <Volume2 className="h-3.5 w-3.5" /> pronounce
              </button>
              {result.partOfSpeech && (
                <span className="inline-block rounded-full bg-accent text-accent-foreground text-[11px] px-2 py-0.5">
                  {result.partOfSpeech}
                </span>
              )}
            </div>
          </header>

          {result.definition && (
            <Field label="Definition">{result.definition}</Field>
          )}
          {result.translation && (
            <Field label="Translation">{result.translation}</Field>
          )}
          {result.example && (
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">Example</p>
              <p className="font-serif italic text-foreground border-l-2 border-accent pl-3">"{result.example}"</p>
            </div>
          )}
        </article>
      )}

      {!result && !lookup.isPending && (
        <div className="text-center py-20 text-muted-foreground">
          <p className="text-sm">Type a word above to begin.</p>
        </div>
      )}

      {result && (
        <div className="fixed bottom-20 left-0 right-0 px-5">
          <div className="max-w-xl mx-auto rounded-xl border border-border bg-card/95 backdrop-blur shadow-lg p-3 flex items-center gap-2">
            {showNewDeck ? (
              <form
                className="flex-1 flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (newDeckName.trim()) createDeck.mutate(newDeckName.trim());
                }}
              >
                <input
                  autoFocus
                  value={newDeckName}
                  onChange={(e) => setNewDeckName(e.target.value)}
                  placeholder="New deck name"
                  className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm outline-none"
                />
                <button type="button" onClick={() => setShowNewDeck(false)} className="text-xs text-muted-foreground px-2">Cancel</button>
              </form>
            ) : (
              <>
                <select
                  value={selectedDeck}
                  onChange={(e) => setSelectedDeck(e.target.value)}
                  className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm outline-none"
                >
                  <option value="">Choose deck…</option>
                  {decks.data?.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
                <button
                  onClick={() => setShowNewDeck(true)}
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline whitespace-nowrap px-2"
                >
                  <Plus className="h-3 w-3" /> New
                </button>
                <button
                  onClick={() => save.mutate()}
                  disabled={!selectedDeck || save.isPending}
                  className={`inline-flex items-center gap-1 rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
                    savedFlash ? "bg-accent text-accent-foreground" : "bg-primary text-primary-foreground hover:bg-primary/90"
                  }`}
                >
                  {savedFlash ? <><Check className="h-4 w-4" /> Saved</> : "Save"}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">{label}</p>
      <p className="text-foreground leading-relaxed">{children}</p>
    </div>
  );
}
