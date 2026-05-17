import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { GraduationCap, Check, X, ArrowRight, RotateCw } from "lucide-react";
import { MobileLayout } from "@/components/MobileLayout";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/study")({
  head: () => ({
    meta: [
      { title: "Study — Lexly" },
      { name: "description", content: "Practice your vocabulary with quizzes and writing drills." },
    ],
  }),
  component: () => (
    <MobileLayout>
      <StudyScreen />
    </MobileLayout>
  ),
});

type Card = {
  id: string;
  word: string;
  definition: string | null;
  translation: string | null;
  part_of_speech: string | null;
  example: string | null;
  deck_id: string;
};

function StudyScreen() {
  const [deckId, setDeckId] = useState<string | null>(null);
  const [mode, setMode] = useState<"choice" | "write">("choice");

  const decks = useQuery({
    queryKey: ["decks"],
    queryFn: async () => {
      const { data, error } = await supabase.from("decks").select("id, name").order("created_at");
      if (error) throw error;
      return data;
    },
  });

  const cards = useQuery({
    queryKey: ["study-cards", deckId],
    enabled: !!deckId,
    queryFn: async () => {
      const { data, error } = await supabase.from("cards").select("*").eq("deck_id", deckId!);
      if (error) throw error;
      return data as Card[];
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-2xl font-semibold">Study</h2>
        <p className="text-sm text-muted-foreground mt-1">Practice what you've saved.</p>
      </div>

      <div className="space-y-3">
        <label className="text-xs text-muted-foreground uppercase tracking-wider">Deck</label>
        <select
          value={deckId ?? ""}
          onChange={(e) => setDeckId(e.target.value || null)}
          className="w-full rounded-md border border-border bg-card px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/40"
        >
          <option value="">Choose a deck…</option>
          {decks.data?.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
      </div>

      <div className="space-y-3">
        <label className="text-xs text-muted-foreground uppercase tracking-wider">Mode</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setMode("choice")}
            className={`rounded-md border px-3 py-2.5 text-sm transition-colors ${
              mode === "choice" ? "border-primary bg-primary/10 text-primary font-medium" : "border-border bg-card"
            }`}
          >
            Multiple choice
          </button>
          <button
            onClick={() => setMode("write")}
            className={`rounded-md border px-3 py-2.5 text-sm transition-colors ${
              mode === "write" ? "border-primary bg-primary/10 text-primary font-medium" : "border-border bg-card"
            }`}
          >
            Writing
          </button>
        </div>
      </div>

      {deckId && cards.data && cards.data.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">This deck has no cards yet.</p>
      )}

      {deckId && cards.data && cards.data.length > 0 && (
        mode === "choice"
          ? <ChoiceQuiz cards={cards.data} />
          : <WriteQuiz cards={cards.data} />
      )}

      {!deckId && (
        <div className="text-center py-16 text-muted-foreground">
          <GraduationCap className="h-8 w-8 mx-auto opacity-30 mb-2" />
          <p className="text-sm">Pick a deck to start studying.</p>
        </div>
      )}
    </div>
  );
}

function useShuffled<T>(items: T[], deps: unknown[]) {
  return useMemo(() => [...items].sort(() => Math.random() - 0.5), deps); // eslint-disable-line react-hooks/exhaustive-deps
}

function ChoiceQuiz({ cards }: { cards: Card[] }) {
  const [round, setRound] = useState(0);
  const queue = useShuffled(cards, [round, cards.length]);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState(0);

  const current = queue[i];
  const options = useMemo(() => {
    if (!current) return [];
    const others = cards.filter((c) => c.id !== current.id);
    const distractors = [...others].sort(() => Math.random() - 0.5).slice(0, 3);
    return [current, ...distractors].sort(() => Math.random() - 0.5);
  }, [current, cards]);

  useEffect(() => { setI(0); setPicked(null); setScore(0); }, [round]);

  if (!current) return null;

  if (i >= queue.length) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-center space-y-4">
        <p className="font-serif text-2xl font-semibold">Done!</p>
        <p className="text-muted-foreground">Score: {score} / {queue.length}</p>
        <button
          onClick={() => setRound((r) => r + 1)}
          className="inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm"
        >
          <RotateCw className="h-4 w-4" /> Study again
        </button>
      </div>
    );
  }

  const prompt = current.definition || current.translation || "(no definition)";

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-5">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{i + 1} / {queue.length}</span>
        <span>Score {score}</span>
      </div>

      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Which word means…</p>
        <p className="text-foreground leading-relaxed">{prompt}</p>
      </div>

      <div className="space-y-2">
        {options.map((opt) => {
          const isCorrect = opt.id === current.id;
          const isPicked = opt.id === picked;
          let cls = "border-border bg-card hover:bg-accent/30";
          if (picked) {
            if (isCorrect) cls = "border-primary bg-primary/10 text-primary";
            else if (isPicked) cls = "border-destructive bg-destructive/10 text-destructive";
            else cls = "border-border bg-card opacity-60";
          }
          return (
            <button
              key={opt.id}
              disabled={!!picked}
              onClick={() => {
                setPicked(opt.id);
                if (isCorrect) setScore((s) => s + 1);
              }}
              className={`w-full text-left rounded-md border px-4 py-3 text-sm font-serif transition-colors flex items-center justify-between ${cls}`}
            >
              <span>{opt.word}</span>
              {picked && isCorrect && <Check className="h-4 w-4" />}
              {picked && isPicked && !isCorrect && <X className="h-4 w-4" />}
            </button>
          );
        })}
      </div>

      {picked && (
        <button
          onClick={() => { setPicked(null); setI((n) => n + 1); }}
          className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-primary text-primary-foreground px-4 py-2.5 text-sm"
        >
          Next <ArrowRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

function WriteQuiz({ cards }: { cards: Card[] }) {
  const [round, setRound] = useState(0);
  const queue = useShuffled(cards, [round, cards.length]);
  const [i, setI] = useState(0);
  const [input, setInput] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  useEffect(() => { setI(0); setInput(""); setSubmitted(false); setScore(0); }, [round]);

  const current = queue[i];
  if (!current) return null;

  if (i >= queue.length) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-center space-y-4">
        <p className="font-serif text-2xl font-semibold">Done!</p>
        <p className="text-muted-foreground">Score: {score} / {queue.length}</p>
        <button
          onClick={() => setRound((r) => r + 1)}
          className="inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm"
        >
          <RotateCw className="h-4 w-4" /> Study again
        </button>
      </div>
    );
  }

  const correct = input.trim().toLowerCase() === current.word.trim().toLowerCase();
  const prompt = current.definition || current.translation || "(no clue)";

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-5">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{i + 1} / {queue.length}</span>
        <span>Score {score}</span>
      </div>

      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Type the word</p>
        <p className="text-foreground leading-relaxed">{prompt}</p>
        {current.translation && current.definition && (
          <p className="text-sm text-muted-foreground mt-1">({current.translation})</p>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!submitted) {
            setSubmitted(true);
            if (correct) setScore((s) => s + 1);
          } else {
            setSubmitted(false);
            setInput("");
            setI((n) => n + 1);
          }
        }}
        className="space-y-3"
      >
        <input
          autoFocus
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={submitted}
          placeholder="your answer…"
          className={`w-full rounded-md border px-4 py-3 font-serif text-lg outline-none focus:ring-2 focus:ring-ring/40 ${
            submitted
              ? correct
                ? "border-primary bg-primary/10 text-primary"
                : "border-destructive bg-destructive/10 text-destructive"
              : "border-border bg-card"
          }`}
        />
        {submitted && !correct && (
          <p className="text-sm text-muted-foreground">
            Correct answer: <span className="font-serif font-semibold text-foreground">{current.word}</span>
          </p>
        )}
        <button
          type="submit"
          disabled={!input.trim() && !submitted}
          className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-primary text-primary-foreground px-4 py-2.5 text-sm disabled:opacity-50"
        >
          {submitted ? <>Next <ArrowRight className="h-4 w-4" /></> : "Check"}
        </button>
      </form>
    </div>
  );
}
