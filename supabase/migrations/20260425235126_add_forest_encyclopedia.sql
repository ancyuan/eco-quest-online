/*
  # Add Forest Encyclopedia Table

  1. New Table
    - `forest_encyclopedia` - Encyclopedia entries for trees with lore, facts, and educational content
      - `tree_kind` (text, primary key) - oak, pine, sakura
      - `label` (text) - Display name
      - `emoji` (text) - Tree emoji for display
      - `oxygen_yield` (integer) - O₂ per harvest
      - `lore` (text) - Fictional story/context about the tree
      - `facts` (jsonb) - Array of educational facts
      - `habitat` (text) - Where this tree naturally grows
      - `impact` (text) - Real-world environmental impact

  2. Security
    - Enable RLS on `forest_encyclopedia` table
    - Add policy for public read access (encyclopedia is informational)

  3. Initial Data
    - Pre-populate with Oak, Pine, and Sakura entries
*/

CREATE TABLE IF NOT EXISTS public.forest_encyclopedia (
  tree_kind TEXT NOT NULL PRIMARY KEY,
  label TEXT NOT NULL,
  emoji TEXT NOT NULL,
  oxygen_yield INTEGER NOT NULL,
  lore TEXT NOT NULL,
  facts JSONB NOT NULL DEFAULT '[]'::jsonb,
  habitat TEXT NOT NULL,
  impact TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.forest_encyclopedia ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Encyclopedia is readable by everyone"
  ON public.forest_encyclopedia FOR SELECT
  USING (true);

-- Insert tree encyclopedia data
INSERT INTO public.forest_encyclopedia (tree_kind, label, emoji, oxygen_yield, lore, facts, habitat, impact)
VALUES
  (
    'oak',
    'Mighty Oak',
    '🌳',
    22,
    'The Oak is a symbol of strength and wisdom, standing as a guardian of the forest for centuries. In ancient legends, Oaks were home to forest spirits and wise old creatures who guided lost travelers. Today, modern Oaks continue their ancestral role as ecological pillars—their deep roots anchor soil, their sprawling canopy shelters countless creatures, and their acorns sustain entire animal populations through harsh winters.',
    '[
      "A mature oak can absorb 22 kg of CO₂ per year",
      "Oak trees can live for 200-300 years, some even older",
      "A single oak can provide habitat for over 900 species",
      "Oak wood has been used for shipbuilding and construction for millennia",
      "Oaks produce acorns that feed deer, squirrels, birds, and wild boar",
      "An old oak can pump 100+ gallons of water from soil daily",
      "Some oak species can regenerate from fire thanks to their thick bark"
    ]'::jsonb,
    'Temperate forests, woodlands, and savannas across Northern Hemisphere and Europe',
    'Oaks are keystones of temperate ecosystems. They support biodiversity, sequester carbon, prevent soil erosion, and provide food for wildlife. In reforestation, Oaks anchor long-term forest recovery.'
  ),
  (
    'pine',
    'Steadfast Pine',
    '🌲',
    18,
    'The Pine stands sentinel in northern lands, a pioneer that thrives where few other trees can grow. Hardy and resolute, Pines were among the first trees to return after the last ice age. Their needle-covered branches whisper ancient songs of resilience, while their roots grip rocky terrain with unwavering strength. Throughout history, humans have relied on Pine for timber, resin, and warmth.',
    '[
      "A pine can absorb 18 kg of CO₂ annually",
      "Pine roots stabilize slopes and prevent landslides",
      "Pine needles take 2-3 years to be replaced, providing year-round structure",
      "Some pine seeds only release when exposed to intense heat from forest fires",
      "Pine resin has been used for waterproofing, medicine, and adhesive for 5000+ years",
      "Pinecones can remain on the tree for years before releasing seeds",
      "Pine forests create their own microclimate and reduce erosion",
      "A pine can survive in poor soil where deciduous trees cannot"
    ]'::jsonb,
    'Boreal and temperate regions, mountains, and northern latitudes worldwide',
    'Pines are carbon storage superstars, locking carbon in their wood and acidic soil for centuries. Their needle litter creates carbon-rich soil. In fire-prone regions, some pines are fire-adapted pioneers essential for forest renewal.'
  ),
  (
    'sakura',
    'Graceful Sakura',
    '🌸',
    15,
    'The Sakura, or Cherry blossom, is nature''s fleeting masterpiece—a celebration of beauty and impermanence. In Japanese culture, the Sakura symbolizes the transient nature of life, blooming brilliantly for just weeks before petals drift like snow. Yet beneath its delicate appearance lies ecological wisdom: the Sakura''s early blossoms feed awakening pollinators, its fruit feeds birds, and its presence marks the return of spring across temperate lands.',
    '[
      "Sakura blossoms appear 2-4 weeks per year and are crucial for spring pollinators",
      "A mature Sakura produces 15 kg of CO₂ reduction annually",
      "Sakura fruit feeds over 50 species of birds",
      "Sakura trees have been cultivated for 2000+ years, originating in Central Asia and the Himalayas",
      "A single Sakura can produce hundreds of flowers in one bloom",
      "Sakura trees often live 30-50 years (some cultivars longer)",
      "The timing of Sakura bloom is a climate change indicator",
      "Sakura wood was historically used for samurai swords and art"
    ]'::jsonb,
    'Temperate Asia (Japan, China, Korea), but now cultivated worldwide',
    'Sakura trees are crucial spring indicators, triggering ecosystem awakening. Their blossoms feed early-season pollinators when few other flowers exist. They symbolize climate resilience—shifts in bloom timing signal changing weather patterns.'
  )
ON CONFLICT (tree_kind) DO NOTHING;
