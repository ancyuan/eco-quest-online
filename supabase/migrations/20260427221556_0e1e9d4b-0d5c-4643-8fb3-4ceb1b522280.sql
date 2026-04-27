-- ============================================================
-- Forest Guardian Phase 2: Species expansion, biomes, ancient trees, unlocks
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS unlocked_trees text[] NOT NULL DEFAULT ARRAY['oak','pine','sakura'],
  ADD COLUMN IF NOT EXISTS unlocked_grid_size integer NOT NULL DEFAULT 6,
  ADD COLUMN IF NOT EXISTS unlocked_biomes text[] NOT NULL DEFAULT ARRAY['rainforest'],
  ADD COLUMN IF NOT EXISTS achievements text[] NOT NULL DEFAULT ARRAY[]::text[];

ALTER TABLE public.forest_states
  ADD COLUMN IF NOT EXISTS grid_size integer NOT NULL DEFAULT 6,
  ADD COLUMN IF NOT EXISTS biome_zones jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS feed_log jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Encyclopedia table (read-only public reference)
CREATE TABLE IF NOT EXISTS public.forest_encyclopedia (
  tree_kind text PRIMARY KEY,
  label text NOT NULL,
  emoji text NOT NULL,
  oxygen_yield integer NOT NULL,
  lore text NOT NULL,
  facts jsonb NOT NULL DEFAULT '[]'::jsonb,
  habitat text NOT NULL,
  impact text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.forest_encyclopedia ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Encyclopedia is public" ON public.forest_encyclopedia;
CREATE POLICY "Encyclopedia is public"
  ON public.forest_encyclopedia
  FOR SELECT
  USING (true);

INSERT INTO public.forest_encyclopedia (tree_kind, label, emoji, oxygen_yield, lore, facts, habitat, impact)
VALUES
  ('oak', 'Oak', '🌳', 22,
    'Oaks are slow-growing giants whose acorns feed entire forests and whose canopy can shelter life for centuries.',
    '["A mature oak absorbs about 22 kg of CO2 per year.","Some oaks live for more than 1,000 years.","A single oak can support over 500 species."]'::jsonb,
    'Temperate forests across the Northern Hemisphere.',
    'Long-lived carbon storage and a keystone species for biodiversity.'),
  ('pine', 'Pine', '🌲', 18,
    'Pines thrive where others struggle — sandy soils, cold winters, and after wildfires their seeds germinate first.',
    '["Pine forests cover roughly 1% of Earth''s land surface.","Some pine cones only open in the heat of a wildfire.","Pine resin has been used as glue and medicine for millennia."]'::jsonb,
    'Boreal and mountain forests across the Northern Hemisphere.',
    'First responders after disturbance — they restore degraded land quickly.'),
  ('sakura', 'Sakura', '🌸', 15,
    'Sakura blossoms paint spring with pink for a brief, breathtaking week before scattering on the wind.',
    '["Hanami — flower viewing — has been celebrated in Japan for over 1,000 years.","Sakura blossoms feed early-spring pollinators.","Their bark was traditionally used in fine craft."]'::jsonb,
    'Temperate East Asia, with cultivated varieties worldwide.',
    'A beloved indicator species: their bloom dates track climate shifts.'),
  ('maple', 'Maple', '🍁', 28,
    'Maples paint forests in fiery autumn colors and produce sweet sap that has been tapped by humans for centuries.',
    '["A mature sugar maple can produce 40 liters of sap per season.","Maple roots can extend twice the width of the canopy.","Maples support over 300 species of insects and birds."]'::jsonb,
    'Temperate deciduous forests of North America, Europe, and East Asia.',
    'Excellent at sequestering carbon and stabilizing soil on slopes.'),
  ('mangrove', 'Mangrove', '🌴', 35,
    'Mangroves stand at the boundary between land and sea, their tangled roots sheltering entire coastal ecosystems.',
    '["Mangroves can store up to 4x more carbon per hectare than rainforests.","Their roots filter salt and protect coastlines from storms.","Over 80% of global fish catches depend on mangrove nurseries."]'::jsonb,
    'Tropical and subtropical coastlines and estuaries.',
    'Critical climate defense — protects shorelines and locks away "blue carbon".'),
  ('bamboo', 'Bamboo', '🎋', 12,
    'Technically a grass, bamboo is among the fastest-growing plants on Earth and a renewable building material.',
    '["Some bamboo species grow up to 91 cm in a single day.","Bamboo releases 35% more oxygen than equivalent trees.","Pandas eat 12-38 kg of bamboo every day."]'::jsonb,
    'Tropical and subtropical regions, especially Asia.',
    'Rapid renewal makes it a sustainable substitute for hardwood.'),
  ('cherry', 'Cherry', '🍒', 17,
    'Wild cherries bear deep-red fruit that birds love, while their wood is prized for fine furniture and instruments.',
    '["Some cherry trees in Japan are over 1,000 years old.","Cherry wood is used in fine furniture and instruments.","Pollinators rely on early cherry blossoms each spring."]'::jsonb,
    'Temperate climates of Asia, Europe, and North America.',
    'Supports early-season pollinators emerging from winter.'),
  ('eucalyptus', 'Eucalyptus', '🌿', 25,
    'Eucalyptus trees are giants of the Australian bush, their oils famous for medicinal scent and natural pest resistance.',
    '["Some eucalyptus species exceed 90 m in height.","Koalas eat almost exclusively eucalyptus leaves.","Eucalyptus oil has been used medicinally for centuries."]'::jsonb,
    'Australia, with widespread cultivation in dry warm climates.',
    'Drought-tolerant; restores degraded land but must be planted carefully to protect water tables.')
ON CONFLICT (tree_kind) DO UPDATE SET
  label = EXCLUDED.label,
  emoji = EXCLUDED.emoji,
  oxygen_yield = EXCLUDED.oxygen_yield,
  lore = EXCLUDED.lore,
  facts = EXCLUDED.facts,
  habitat = EXCLUDED.habitat,
  impact = EXCLUDED.impact;
