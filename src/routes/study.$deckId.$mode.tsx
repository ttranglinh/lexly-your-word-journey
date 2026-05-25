import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { X, Volume2, ArrowRight, Check, RotateCw } from "lucide-react";
import { MobileLayout } from "@/components/MobileLayout";
import { supabase } from "@/integrations/supabase/client";
import { speak } from "@/lib/speak";

export const Route = createFileRoute("/study/$deckId/$mode")({
  head: () => ({
    meta: [
      { title: "Study — Lexly" },
      { name: "description", content: "Practice vocabulary with quizzes and writing." },
    ],
  }),
  component: () => (
    <MobileLayout hideChrome>
      <StudyRunner />
    </MobileLayout>
  ),
});

export type Card = {
  id: string;
  word: string;
  definition: string | null;
  translation: string | null;
  part_of_speech: string | null;
  example: string | null;
  deck_id: string;
};

const MODE_LABELS: Record<string, string> = {
  writing: "Writing",
  flashcard: "Flashcards",
  mcq: "Multiple Choice",
  matching: "Matching",
};

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

function StudyRunner() {
  const { deckId, mode } = Route.useParams();

  const deck = useQuery({
    queryKey: ["deck", deckId],
    queryFn: async () => (await supabase.from("decks").select("name").eq("id", deckId).single()).data,
  });

  const cards = useQuery({
    queryKey: ["study-cards", deckId],
    queryFn: async () => {
      const { data, error } = await supabase.from("cards").select("*").eq("deck_id", deckId);
      if (error) throw error;
      return data as Card[];
    },
  });

  const list = cards.data ?? [];

  return (
    <div className="min-h-screen flex flex-col">
      <TopBar deckName={deck.data?.name ?? ""} />
      <div className="flex-1 px-5 py-4 max-w-xl w-full mx-auto">
        {cards.isLoading && <p className="text-center text-muted-foreground py-20 text-sm">Loading…</p>}
        {!cards.isLoading && list.length === 0 && (
          <div className="text-center py-20 space-y-3">
            <p className="text-muted-foreground text-sm">This deck has no words yet.</p>
            <Link to="/decks/$deckId" params={{ deckId }} className="inline-block text-primary text-sm hover:underline">
              ← Back to deck
            </Link>
          </div>
        )}
        {list.length > 0 && mode === "writing" && <WritingMode cards={list} deckName={deck.data?.name ?? ""} />}
        {list.length > 0 && mode === "flashcard" && <FlashcardMode cards={list} />}
        {list.length > 0 && mode === "mcq" && <MCQMode cards={list} />}
        {list.length > 0 && mode === "matching" && <MatchingMode cards={list} />}
        {list.length > 0 && !MODE_LABELS[mode] && (
          <p className="text-center text-muted-foreground py-20 text-sm">Unknown mode.</p>
        )}
      </div>
    </div>
  );
}

function TopBar({ deckName }: { deckName: string }) {
  const { deckId, mode } = Route.useParams();
  const navigate = useNavigate();
  return (
    <header className="px-5 py-4 border-b border-border flex items-center justify-between">
      <button
        onClick={() => navigate({ to: "/decks/$deckId", params: { deckId } })}
        className="text-muted-foreground hover:text-foreground"
        aria-label="Exit"
      >
        <X className="h-5 w-5" />
      </button>
      <p className="text-xs text-muted-foreground">
        <span className="text-foreground font-medium">{MODE_LABELS[mode] ?? mode}</span>
        {deckName && <> · {deckName}</>}
      </p>
      <span className="w-5" />
    </header>
  );
}

function Progress({ i, total }: { i: number; total: number }) {
  const pct = Math.min(100, (i / total) * 100);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>{Math.min(i + 1, total)}/{total}</span>
        <span>{Math.round(pct)}%</span>
      </div>
      <div className="h-1 rounded-full bg-muted overflow-hidden">
        <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function DoneCard({ score, total, onAgain }: { score: number; total: number; onAgain: () => void }) {
  const { deckId } = Route.useParams();
  const pct = Math.round((score / Math.max(1, total)) * 100);
  return (
    <div className="rounded-2xl border border-border bg-card p-8 text-center space-y-4 mt-12">
      <p className="text-[11px] uppercase tracking-wider text-primary">Session complete</p>
      <p className="font-serif text-5xl font-semibold">{pct}%</p>
      <p className="text-sm text-muted-foreground">{score} of {total} correct</p>
      <div className="flex gap-2 justify-center pt-2">
        <button
          onClick={onAgain}
          className="inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm"
        >
          <RotateCw className="h-4 w-4" /> Again
        </button>
        <Link
          to="/decks/$deckId"
          params={{ deckId }}
          className="inline-flex items-center rounded-md border border-border px-4 py-2 text-sm hover:bg-accent/30"
        >
          Done
        </Link>
      </div>
    </div>
  );
}

/* ---------- Writing ---------- */
function WritingMode({ cards, deckName }: { cards: Card[]; deckName: string }) {
  const [round, setRound] = useState(0);
  const queue = useMemo(() => shuffle(cards), [round, cards.length]); // eslint-disable-line
  const [i, setI] = useState(0);
  const [input, setInput] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  useEffect(() => { setI(0); setInput(""); setSubmitted(false); setScore(0); }, [round]);

  const current = queue[i];
  if (!current) return null;
  if (i >= queue.length) return <DoneCard score={score} total={queue.length} onAgain={() => setRound((r) => r + 1)} />;

  const correct = input.trim().toLowerCase() === current.word.trim().toLowerCase();
  const prompt = current.definition || current.translation || "(no clue)";

  return (
    <div className="space-y-6">
      <Progress i={i} total={queue.length} />
      <div className="rounded-2xl border border-border bg-card p-6 space-y-3">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Definition</p>
        <p className="font-serif text-xl leading-relaxed">{prompt}</p>
        {current.part_of_speech && (
          <p className="text-xs text-muted-foreground italic">{current.part_of_speech}</p>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!submitted) { setSubmitted(true); if (correct) setScore((s) => s + 1); }
          else { setSubmitted(false); setInput(""); setI((n) => n + 1); }
        }}
        className="space-y-4"
      >
        <input
          autoFocus
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={submitted}
          placeholder="Type your answer"
          className={`w-full bg-transparent border-0 border-b-2 px-1 py-3 font-serif text-2xl outline-none transition-colors ${
            submitted
              ? correct ? "border-primary text-primary" : "border-destructive text-destructive"
              : "border-border focus:border-primary"
          }`}
        />
        {submitted && !correct && (
          <p className="text-sm text-muted-foreground">
            Correct: <span className="font-serif font-semibold text-foreground">{current.word}</span>
          </p>
        )}
        <button
          type="submit"
          disabled={!input.trim() && !submitted}
          className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-3 text-sm font-medium disabled:opacity-50"
        >
          {submitted ? <>Next <ArrowRight className="h-4 w-4" /></> : <>Check answer <ArrowRight className="h-4 w-4" /></>}
        </button>
        {!submitted && (
          <button
            type="button"
            onClick={() => { setSubmitted(true); }}
            className="w-full text-xs text-muted-foreground hover:text-foreground"
          >
            skip · I don't know
          </button>
        )}
        <p className="text-[11px] text-center text-muted-foreground pt-2">from deck: {deckName}</p>
      </form>
    </div>
  );
}

/* ---------- Flashcard ---------- */
function FlashcardMode({ cards }: { cards: Card[] }) {
  const [round, setRound] = useState(0);
  const queue = useMemo(() => shuffle(cards), [round, cards.length]); // eslint-disable-line
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [score, setScore] = useState(0);

  useEffect(() => { setI(0); setFlipped(false); setScore(0); }, [round]);

  const current = queue[i];
  if (!current) return null;
  if (i >= queue.length) return <DoneCard score={score} total={queue.length} onAgain={() => setRound((r) => r + 1)} />;

  const next = (gotIt: boolean) => {
    if (gotIt) setScore((s) => s + 1);
    setFlipped(false);
    setI((n) => n + 1);
  };

  return (
    <div className="space-y-6">
      <Progress i={i} total={queue.length} />

      <button
        onClick={() => setFlipped((f) => !f)}
        className="w-full min-h-[280px] rounded-2xl border border-border bg-card p-8 flex flex-col items-center justify-center gap-4 text-center hover:bg-accent/10 transition-colors"
      >
        {!flipped ? (
          <>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Tap to reveal</p>
            <p className="font-serif text-4xl font-semibold">{current.word}</p>
            {current.part_of_speech && (
              <span className="text-xs text-muted-foreground italic">{current.part_of_speech}</span>
            )}
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => { e.stopPropagation(); speak(current.word); }}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary mt-2"
            >
              <Volume2 className="h-3.5 w-3.5" /> pronounce
            </span>
          </>
        ) : (
          <div className="space-y-3 w-full">
            {current.definition && <p className="text-base leading-relaxed">{current.definition}</p>}
            {current.translation && <p className="text-sm text-muted-foreground">→ {current.translation}</p>}
            {current.example && <p className="font-serif italic text-sm text-muted-foreground border-l-2 border-accent pl-3 text-left">"{current.example}"</p>}
          </div>
        )}
      </button>

      {flipped ? (
        <div className="grid grid-cols-3 gap-2">
          <button onClick={() => next(false)} className="rounded-lg border border-border bg-card py-3 text-sm hover:bg-muted">Again</button>
          <button onClick={() => next(false)} className="rounded-lg border border-border bg-card py-3 text-sm hover:bg-muted">Hard</button>
          <button onClick={() => next(true)} className="rounded-lg bg-primary text-primary-foreground py-3 text-sm font-medium">Good</button>
        </div>
      ) : (
        <button
          onClick={() => setFlipped(true)}
          className="w-full rounded-lg bg-primary text-primary-foreground py-3 text-sm font-medium"
        >
          Show answer
        </button>
      )}
    </div>
  );
}

/* ---------- Multiple Choice ---------- */
function MCQMode({ cards }: { cards: Card[] }) {
  const [round, setRound] = useState(0);
  const queue = useMemo(() => shuffle(cards), [round, cards.length]); // eslint-disable-line
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState(0);

  useEffect(() => { setI(0); setPicked(null); setScore(0); }, [round]);

  const current = queue[i];
  const options = useMemo(() => {
    if (!current) return [];
    const others = cards.filter((c) => c.id !== current.id);
    const distractors = shuffle(others).slice(0, 3);
    return shuffle([current, ...distractors]);
  }, [current, cards]);

  if (!current) return null;
  if (i >= queue.length) return <DoneCard score={score} total={queue.length} onAgain={() => setRound((r) => r + 1)} />;

  return (
    <div className="space-y-6">
      <Progress i={i} total={queue.length} />

      <div className="rounded-2xl border border-border bg-card p-6 text-center space-y-3">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Choose the correct definition</p>
        <div className="flex items-center justify-center gap-2">
          <p className="font-serif text-3xl font-semibold">{current.word}</p>
          <button onClick={() => speak(current.word)} className="text-muted-foreground hover:text-primary">
            <Volume2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {options.map((opt, idx) => {
          const isCorrect = opt.id === current.id;
          const isPicked = opt.id === picked;
          let cls = "border-border bg-card hover:bg-accent/20";
          if (picked) {
            if (isCorrect) cls = "border-primary bg-primary/10 text-foreground";
            else if (isPicked) cls = "border-destructive bg-destructive/10 text-foreground";
            else cls = "border-border bg-card opacity-50";
          }
          return (
            <button
              key={opt.id}
              disabled={!!picked}
              onClick={() => { setPicked(opt.id); if (isCorrect) setScore((s) => s + 1); }}
              className={`w-full text-left rounded-lg border px-4 py-3 transition-colors flex items-start gap-3 ${cls}`}
            >
              <span className="text-xs font-medium text-muted-foreground mt-0.5 w-4">{String.fromCharCode(65 + idx)}</span>
              <span className="flex-1 text-sm">{opt.definition || opt.translation || opt.word}</span>
              {picked && isCorrect && <Check className="h-4 w-4 text-primary" />}
              {picked && isPicked && !isCorrect && <X className="h-4 w-4 text-destructive" />}
            </button>
          );
        })}
      </div>

      {picked && (
        <button
          onClick={() => { setPicked(null); setI((n) => n + 1); }}
          className="w-full rounded-lg bg-primary text-primary-foreground py-3 text-sm font-medium inline-flex items-center justify-center gap-2"
        >
          Next <ArrowRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

/* ---------- Matching ---------- */
function MatchingMode({ cards }: { cards: Card[] }) {
  const [round, setRound] = useState(0);
  const pool = useMemo(() => shuffle(cards).slice(0, Math.min(5, cards.length)), [round, cards.length]); // eslint-disable-line
  const [leftPick, setLeftPick] = useState<string | null>(null);
  const [rightPick, setRightPick] = useState<string | null>(null);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [wrong, setWrong] = useState<{ l: string; r: string } | null>(null);
  const shuffledRight = useMemo(() => shuffle(pool), [pool]);

  useEffect(() => { setLeftPick(null); setRightPick(null); setMatched(new Set()); setWrong(null); }, [round]);

  useEffect(() => {
    if (leftPick && rightPick) {
      if (leftPick === rightPick) {
        setMatched((m) => new Set(m).add(leftPick));
        setLeftPick(null); setRightPick(null);
      } else {
        setWrong({ l: leftPick, r: rightPick });
        const t = setTimeout(() => { setWrong(null); setLeftPick(null); setRightPick(null); }, 600);
        return () => clearTimeout(t);
      }
    }
  }, [leftPick, rightPick]);

  const total = pool.length;
  if (total === 0) return null;
  if (matched.size === total) {
    return <DoneCard score={total} total={total} onAgain={() => setRound((r) => r + 1)} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>Match all pairs</span>
        <span>{matched.size}/{total} matched</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          {pool.map((c) => {
            const done = matched.has(c.id);
            const picked = leftPick === c.id;
            const isWrong = wrong?.l === c.id;
            return (
              <button
                key={c.id}
                disabled={done}
                onClick={() => setLeftPick(c.id)}
                className={`w-full rounded-lg border px-3 py-3 text-sm font-serif transition-all ${
                  done ? "opacity-0 pointer-events-none" :
                  isWrong ? "border-destructive bg-destructive/10 animate-pulse" :
                  picked ? "border-primary bg-primary/10" : "border-border bg-card hover:bg-accent/20"
                }`}
              >
                {c.word}
              </button>
            );
          })}
        </div>
        <div className="space-y-2">
          {shuffledRight.map((c) => {
            const done = matched.has(c.id);
            const picked = rightPick === c.id;
            const isWrong = wrong?.r === c.id;
            const text = c.definition || c.translation || c.word;
            return (
              <button
                key={c.id}
                disabled={done}
                onClick={() => setRightPick(c.id)}
                className={`w-full rounded-lg border px-3 py-3 text-xs text-left transition-all ${
                  done ? "opacity-0 pointer-events-none" :
                  isWrong ? "border-destructive bg-destructive/10 animate-pulse" :
                  picked ? "border-primary bg-primary/10" : "border-border bg-card hover:bg-accent/20"
                }`}
              >
                {text.length > 80 ? text.slice(0, 80) + "…" : text}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
