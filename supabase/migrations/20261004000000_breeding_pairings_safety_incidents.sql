-- Breeding & Lineage Hub persistence
--   breeding_pairings : pairing history (sire x dam) with outcome + notes
--   safety_incidents  : per-bird health / safety log tied to the bird code
-- Parent references are stored as denormalized names/codes (same convention as
-- fowl.sire / fowl.dam and match.entry_name) so renaming or deleting a chicken
-- never breaks the recorded history.

CREATE TABLE IF NOT EXISTS breeding_pairings (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  sire_id BIGINT,
  dam_id BIGINT,
  sire_name TEXT NOT NULL CHECK (btrim(sire_name) <> ''),
  dam_name TEXT NOT NULL CHECK (btrim(dam_name) <> ''),
  sire_code TEXT,
  dam_code TEXT,
  pairing_date DATE,
  notes TEXT,
  outcome TEXT NOT NULL DEFAULT 'Active' CHECK (outcome IN ('Active', 'Completed', 'Discontinued')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS safety_incidents (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  fowl_id BIGINT,
  fowl_name TEXT NOT NULL CHECK (btrim(fowl_name) <> ''),
  fowl_code TEXT,
  incident_date DATE NOT NULL DEFAULT CURRENT_DATE,
  type TEXT NOT NULL DEFAULT 'Injury'
    CHECK (type IN ('Injury', 'Illness', 'Accident', 'Fight Wound', 'Environmental')),
  severity TEXT NOT NULL DEFAULT 'Minor'
    CHECK (severity IN ('Minor', 'Moderate', 'Severe', 'Critical')),
  status TEXT NOT NULL DEFAULT 'Treated'
    CHECK (status IN ('Treated', 'Monitoring', 'Recovered', 'Deceased')),
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_breeding_pairings_user_id ON breeding_pairings(user_id);
CREATE INDEX IF NOT EXISTS idx_breeding_pairings_user_outcome ON breeding_pairings(user_id, outcome);
CREATE INDEX IF NOT EXISTS idx_breeding_pairings_user_pair
  ON breeding_pairings(user_id, lower(sire_name), lower(dam_name));
CREATE INDEX IF NOT EXISTS idx_safety_incidents_user_id ON safety_incidents(user_id);
CREATE INDEX IF NOT EXISTS idx_safety_incidents_user_severity ON safety_incidents(user_id, severity);
CREATE INDEX IF NOT EXISTS idx_safety_incidents_user_fowl
  ON safety_incidents(user_id, lower(fowl_name));

-- RLS: Owner isolation
ALTER TABLE breeding_pairings ENABLE ROW LEVEL SECURITY;
ALTER TABLE safety_incidents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "breeding_pairings_owner_select" ON breeding_pairings;
CREATE POLICY "breeding_pairings_owner_select" ON breeding_pairings
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "breeding_pairings_owner_insert" ON breeding_pairings;
CREATE POLICY "breeding_pairings_owner_insert" ON breeding_pairings
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "breeding_pairings_owner_update" ON breeding_pairings;
CREATE POLICY "breeding_pairings_owner_update" ON breeding_pairings
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "breeding_pairings_owner_delete" ON breeding_pairings;
CREATE POLICY "breeding_pairings_owner_delete" ON breeding_pairings
  FOR DELETE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "safety_incidents_owner_select" ON safety_incidents;
CREATE POLICY "safety_incidents_owner_select" ON safety_incidents
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "safety_incidents_owner_insert" ON safety_incidents;
CREATE POLICY "safety_incidents_owner_insert" ON safety_incidents
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "safety_incidents_owner_update" ON safety_incidents;
CREATE POLICY "safety_incidents_owner_update" ON safety_incidents
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "safety_incidents_owner_delete" ON safety_incidents;
CREATE POLICY "safety_incidents_owner_delete" ON safety_incidents
  FOR DELETE USING (user_id = auth.uid());

-- Admin read access
DROP POLICY IF EXISTS "breeding_pairings_admin_select" ON breeding_pairings;
CREATE POLICY "breeding_pairings_admin_select" ON breeding_pairings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id::uuid = auth.uid()
      AND (profiles.is_admin = true OR profiles.role = 'admin')
    )
  );

DROP POLICY IF EXISTS "safety_incidents_admin_select" ON safety_incidents;
CREATE POLICY "safety_incidents_admin_select" ON safety_incidents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id::uuid = auth.uid()
      AND (profiles.is_admin = true OR profiles.role = 'admin')
    )
  );
