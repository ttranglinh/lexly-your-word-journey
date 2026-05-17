import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, Plus, BookmarkPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { MobileLayout } from "@/components/MobileLayout";
import { lookupWord, type WordResult } from "@/lib/dictionary";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  component: () => (
    <MobileLayout>
      <SearchScreen />
    </MobileLayout>
  ),
});

function SearchScreen() {
  const [q, setQ] = useState("");
  const [result, setResult] = useState<WordResult | null>(null);
  const qc = useQueryClient();

  const decks = useQuery({
    queryKey: ["decks"],
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

  const save = useMutation({
    mutationFn: async (deckId: string) => {
      if (!result) return;
      const { error } = await supabase.from("cards").insert({
        deck_id: deckId,
        word: result.word,
        definition: result.definition,
        translation: result.translation,
        part_of_speech: result.partOfSpeech,
        example: result.example,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Saved to deck");
      qc.invalidateQueries({ queryKey: ["cards"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-2xl font-semibold">Look up a word</h2>
        <p className="text-sm text-muted-foreground mt-1">Search the dictionary and save to a deck.</p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (q.trim()) lookup.mutate(q);
        }}
        className="relative"
      >
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="e.g. serendipity"
          className="w-full rounded-lg bg-input/60 border border-border pl-10 pr-4 py-3 text-base outline-none focus:ring-2 focus:ring-ring/40 focus:bg-card"
          autoFocus
        />
      </form>

      {lookup.isPending && (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      )}

      {result && !lookup.isPending && (
        <article className="rounded-xl border border-border bg-card p-5 space-y-4">
          <header className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-serif text-3xl font-semibold">{result.word}</h3>
              {result.partOfSpeech && (
                <span className="inline-block mt-1 text-xs uppercase tracking-wider text-primary font-medium">
                  {result.partOfSpeech}
                </span>
              )}
            </div>
          </header>

          {result.definition && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Definition</p>
              <p className="text-foreground leading-relaxed">{result.definition}</p>
            </div>
          )}

          {result.translation && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Translation (ES)</p>
              <p className="text-foreground">{result.translation}</p>
            </div>
          )}

          {result.example && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Example</p>
              <p className="text-foreground italic font-serif">"{result.example}"</p>
            </div>
          )}

          <div className="pt-2 border-t border-border space-y-2">
            <p className="text-xs text-muted-foreground">Save to deck</p>
            <div className="flex flex-wrap gap-2">
              {decks.data?.map((d) => (
                <button
                  key={d.id}
                  onClick={() => save.mutate(d.id)}
                  disabled={save.isPending}
                  className="inline-flex items-center gap-1.5 rounded-md bg-secondary hover:bg-accent text-secondary-foreground px-3 py-1.5 text-sm transition-colors disabled:opacity-50"
                >
                  <BookmarkPlus className="h-3.5 w-3.5" />
                  {d.name}
                </button>
              ))}
              {decks.data?.length === 0 && (
                <p className="text-sm text-muted-foreground">Create a deck first in the Decks tab.</p>
              )}
            </div>
          </div>
        </article>
      )}

      {!result && !lookup.isPending && (
        <div className="text-center py-16 text-muted-foreground">
          <Plus className="h-8 w-8 mx-auto opacity-30 mb-2" />
          <p className="text-sm">Search a word to get started</p>
        </div>
      )}
    </div>
  );
}
