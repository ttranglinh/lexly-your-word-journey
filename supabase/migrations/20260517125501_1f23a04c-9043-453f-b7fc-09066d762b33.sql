
CREATE TABLE public.decks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deck_id UUID NOT NULL REFERENCES public.decks(id) ON DELETE CASCADE,
  word TEXT NOT NULL,
  definition TEXT,
  translation TEXT,
  part_of_speech TEXT,
  example TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX cards_deck_id_idx ON public.cards(deck_id);

ALTER TABLE public.decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read decks" ON public.decks FOR SELECT USING (true);
CREATE POLICY "Public insert decks" ON public.decks FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update decks" ON public.decks FOR UPDATE USING (true);
CREATE POLICY "Public delete decks" ON public.decks FOR DELETE USING (true);

CREATE POLICY "Public read cards" ON public.cards FOR SELECT USING (true);
CREATE POLICY "Public insert cards" ON public.cards FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update cards" ON public.cards FOR UPDATE USING (true);
CREATE POLICY "Public delete cards" ON public.cards FOR DELETE USING (true);

INSERT INTO public.decks (name, description) VALUES ('My First Deck', 'Words I want to learn');
