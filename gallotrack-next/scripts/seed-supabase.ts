/**
 * GalloTrack Comprehensive Seed Script for Supabase
 * 
 * Run: npx tsx scripts/seed-supabase.ts
 * 
 * Creates a test user and populates the database with:
 *   - 3 foundation sires (Lemon, Sweater, Hatch)
 *   - 3 foundation hens
 *   - Full-sibling families (same sire + same dam)
 *   - Half-sibling groups via Sire (same sire, different dams)
 *   - Half-sibling groups via Dam (same dam, different sires)
 *   - Multi-generation lineage (grandchildren)
 *   - 25+ match records with varied outcomes & post-fight conditions
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const envPath = path.resolve(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars: Record<string, string> = {};
envContent.split('\n').forEach((line) => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx === -1) return;
  const key = trimmed.slice(0, eqIdx).trim();
  let val = trimmed.slice(eqIdx + 1).trim();
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    val = val.slice(1, -1);
  }
  envVars[key] = val;
});

const supabaseUrl = envVars['NEXT_PUBLIC_SUPABASE_URL']!;
const supabaseServiceKey = envVars['SUPABASE_SERVICE_ROLE_KEY']!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const TEST_EMAIL = 'farmowner@gallotrack.test';
const TEST_PASSWORD = 'TestFarm123!';
const TEST_FARM_NAME = 'Dingle Elite Gamefarm';

// ─── FOUNDATION STOCK (Sires) ──────────────────────────────────────────────
const FOUNDATION_SIRES = [
  { name: 'Iron Lemon', breed: 'Lemon', gender: 'Rooster', birthdate: '2023-06-15', weight: '2.3', height: '56', leg_color: 'Yellow', color: 'Black-Breasted Red', color_category: 'Red', behavior_trait: 'Aggressive', eye_variant: 'Pearl' },
  { name: 'Titan Sweater', breed: 'Sweater', gender: 'Rooster', birthdate: '2023-08-20', weight: '2.1', height: '54', leg_color: 'White', color: 'Wheaten', color_category: 'Wheaten', behavior_trait: 'Smart Fighter', eye_variant: 'Beanie' },
  { name: 'True Hatch', breed: 'Hatch', gender: 'Rooster', birthdate: '2023-09-10', weight: '2.4', height: '57', leg_color: 'Green / Slate', color: 'Dark Red', color_category: 'Red', behavior_trait: 'Powerful', eye_variant: 'Sta. Cruz' },
];

// ─── FOUNDATION HENS ────────────────────────────────────────────────────────
const FOUNDATION_HENS = [
  { name: 'Golden Pearl', breed: 'Lemon', gender: 'Hen', birthdate: '2023-07-01', weight: '1.7', height: '46', leg_color: 'Yellow', color: 'Wheaten', color_category: 'Wheaten', behavior_trait: 'Calm', eye_variant: 'Pearl' },
  { name: 'Sunrise Queen', breed: 'Sweater', gender: 'Hen', birthdate: '2023-10-05', weight: '1.6', height: '44', leg_color: 'Willow', color: 'Wheaten', color_category: 'Wheaten', behavior_trait: 'Alert', eye_variant: 'Beanie' },
  { name: 'Mountain Rose', breed: 'Hatch', gender: 'Hen', birthdate: '2023-11-12', weight: '1.8', height: '47', leg_color: 'Black', color: 'Dark Cornish', color_category: 'Dark', behavior_trait: 'Broody', eye_variant: 'Pearl' },
  { name: 'Silver Princess', breed: 'Sweater', gender: 'Hen', birthdate: '2024-01-20', weight: '1.5', height: '43', leg_color: 'White', color: 'White', color_category: 'White', behavior_trait: 'Active', eye_variant: 'Beanie' },
];

// ─── OFFSPRING ──────────────────────────────────────────────────────────────
// Format: name, gender, birthdate, sire_name, dam_name, breed, weight, height, leg_color, color, color_category, behavior, eye
type OffspringDef = {
  name: string; gender: string; birthdate: string;
  sire: string; dam: string; breed: string;
  weight: string; height: string; leg_color: string;
  color: string; color_category: string;
  behavior_trait: string; eye_variant: string;
};

const OFFSPRING: OffspringDef[] = [
  // ═══ FULL-SIBLING FAMILY A (Iron Lemon × Golden Pearl) ═══════════════════
  // Same sire AND same dam = full siblings
  { name: 'Lemon Storm', gender: 'Rooster', birthdate: '2024-03-10', sire: 'Iron Lemon', dam: 'Golden Pearl', breed: 'Lemon', weight: '2.0', height: '52', leg_color: 'Yellow', color: 'Black-Breasted Red', color_category: 'Red', behavior_trait: 'Aggressive', eye_variant: 'Pearl' },
  { name: 'Lemon Blaze', gender: 'Rooster', birthdate: '2024-03-10', sire: 'Iron Lemon', dam: 'Golden Pearl', breed: 'Lemon', weight: '2.1', height: '53', leg_color: 'Yellow', color: 'Black-Breasted Red', color_category: 'Red', behavior_trait: 'Smart Fighter', eye_variant: 'Pearl' },
  { name: 'Lemon Grace', gender: 'Hen', birthdate: '2024-03-10', sire: 'Iron Lemon', dam: 'Golden Pearl', breed: 'Lemon', weight: '1.6', height: '45', leg_color: 'Yellow', color: 'Wheaten', color_category: 'Wheaten', behavior_trait: 'Calm', eye_variant: 'Pearl' },
  { name: 'Lemon Duke', gender: 'Rooster', birthdate: '2024-03-10', sire: 'Iron Lemon', dam: 'Golden Pearl', breed: 'Lemon', weight: '2.2', height: '54', leg_color: 'Yellow', color: 'Black-Breasted Red', color_category: 'Red', behavior_trait: 'Powerful', eye_variant: 'Pearl' },

  // ═══ FULL-SIBLING FAMILY B (Titan Sweater × Sunrise Queen) ════════════════
  { name: 'Sweater Flash', gender: 'Rooster', birthdate: '2024-04-15', sire: 'Titan Sweater', dam: 'Sunrise Queen', breed: 'Sweater', weight: '1.9', height: '51', leg_color: 'White', color: 'Wheaten', color_category: 'Wheaten', behavior_trait: 'Fast', eye_variant: 'Beanie' },
  { name: 'Sweater Bolt', gender: 'Rooster', birthdate: '2024-04-15', sire: 'Titan Sweater', dam: 'Sunrise Queen', breed: 'Sweater', weight: '2.0', height: '52', leg_color: 'White', color: 'Wheaten', color_category: 'Wheaten', behavior_trait: 'Aggressive', eye_variant: 'Beanie' },
  { name: 'Sweater Angel', gender: 'Hen', birthdate: '2024-04-15', sire: 'Titan Sweater', dam: 'Sunrise Queen', breed: 'Sweater', weight: '1.5', height: '44', leg_color: 'White', color: 'Wheaten', color_category: 'Wheaten', behavior_trait: 'Alert', eye_variant: 'Beanie' },

  // ═══ FULL-SIBLING FAMILY C (True Hatch × Mountain Rose) ═══════════════════
  { name: 'Hatch Thunder', gender: 'Rooster', birthdate: '2024-05-20', sire: 'True Hatch', dam: 'Mountain Rose', breed: 'Hatch', weight: '2.3', height: '55', leg_color: 'Green / Slate', color: 'Dark Red', color_category: 'Red', behavior_trait: 'Powerful', eye_variant: 'Sta. Cruz' },
  { name: 'Hatch Storm', gender: 'Rooster', birthdate: '2024-05-20', sire: 'True Hatch', dam: 'Mountain Rose', breed: 'Hatch', weight: '2.2', height: '54', leg_color: 'Green / Slate', color: 'Dark Red', color_category: 'Red', behavior_trait: 'Smart Fighter', eye_variant: 'Sta. Cruz' },
  { name: 'Hatch Rose', gender: 'Hen', birthdate: '2024-05-20', sire: 'True Hatch', dam: 'Mountain Rose', breed: 'Hatch', weight: '1.7', height: '46', leg_color: 'Black', color: 'Dark Cornish', color_category: 'Dark', behavior_trait: 'Broody', eye_variant: 'Pearl' },

  // ═══ HALF-SIBLINGS VIA SIRE: Iron Lemon × different dams ═══════════════════
  // Same sire (Iron Lemon), different dams = half-siblings from father's side
  { name: 'Lemon-Sweater Cross', gender: 'Rooster', birthdate: '2024-04-01', sire: 'Iron Lemon', dam: 'Sunrise Queen', breed: 'Lemon', weight: '1.9', height: '50', leg_color: 'Yellow', color: 'Wheaten', color_category: 'Wheaten', behavior_trait: 'Fast', eye_variant: 'Beanie' },
  { name: 'Lemon Silver', gender: 'Hen', birthdate: '2024-04-01', sire: 'Iron Lemon', dam: 'Silver Princess', breed: 'Lemon', weight: '1.5', height: '43', leg_color: 'White', color: 'White', color_category: 'White', behavior_trait: 'Active', eye_variant: 'Beanie' },

  // ═══ HALF-SIBLINGS VIA SIRE: Titan Sweater × different dams ════════════════
  { name: 'Sweater Gold', gender: 'Rooster', birthdate: '2024-05-01', sire: 'Titan Sweater', dam: 'Golden Pearl', breed: 'Sweater', weight: '1.8', height: '49', leg_color: 'Yellow', color: 'Wheaten', color_category: 'Wheaten', behavior_trait: 'Smart Fighter', eye_variant: 'Pearl' },
  { name: 'Sweater Mountain', gender: 'Rooster', birthdate: '2024-06-01', sire: 'Titan Sweater', dam: 'Mountain Rose', breed: 'Sweater', weight: '2.0', height: '51', leg_color: 'Green / Slate', color: 'Dark Red', color_category: 'Red', behavior_trait: 'Powerful', eye_variant: 'Sta. Cruz' },

  // ═══ HALF-SIBLINGS VIA DAM: Golden Pearl × different sires ═════════════════
  // Same dam (Golden Pearl), different sires = half-siblings from mother's side
  { name: 'Sweater-Lemon Blend', gender: 'Rooster', birthdate: '2024-04-20', sire: 'Titan Sweater', dam: 'Golden Pearl', breed: 'Sweater', weight: '1.9', height: '50', leg_color: 'Yellow', color: 'Wheaten', color_category: 'Wheaten', behavior_trait: 'Aggressive', eye_variant: 'Pearl' },
  { name: 'Hatch-Lemon Mix', gender: 'Hen', birthdate: '2024-05-15', sire: 'True Hatch', dam: 'Golden Pearl', breed: 'Hatch', weight: '1.6', height: '45', leg_color: 'Green / Slate', color: 'Dark Cornish', color_category: 'Dark', behavior_trait: 'Broody', eye_variant: 'Pearl' },

  // ═══ HALF-SIBLINGS VIA DAM: Mountain Rose × different sires ════════════════
  { name: 'Lemon-Mountain', gender: 'Rooster', birthdate: '2024-06-10', sire: 'Iron Lemon', dam: 'Mountain Rose', breed: 'Lemon', weight: '2.1', height: '53', leg_color: 'Green / Slate', color: 'Black-Breasted Red', color_category: 'Red', behavior_trait: 'Aggressive', eye_variant: 'Sta. Cruz' },
  { name: 'Sweater-Mountain', gender: 'Rooster', birthdate: '2024-07-01', sire: 'Titan Sweater', dam: 'Mountain Rose', breed: 'Sweater', weight: '2.0', height: '52', leg_color: 'Green / Slate', color: 'Wheaten', color_category: 'Wheaten', behavior_trait: 'Fast', eye_variant: 'Sta. Cruz' },

  // ═══ 2ND GENERATION (grandchildren) ════════════════════════════════════════
  // Lemon Storm (from Family A) × Sweater Angel (from Family B) = cross-family
  { name: 'Elite Thunder', gender: 'Rooster', birthdate: '2024-09-01', sire: 'Lemon Storm', dam: 'Sweater Angel', breed: 'Lemon', weight: '1.8', height: '49', leg_color: 'Yellow', color: 'Wheaten', color_category: 'Wheaten', behavior_trait: 'Smart Fighter', eye_variant: 'Pearl' },
  { name: 'Elite Flash', gender: 'Rooster', birthdate: '2024-09-01', sire: 'Lemon Storm', dam: 'Sweater Angel', breed: 'Lemon', weight: '1.7', height: '48', leg_color: 'White', color: 'Wheaten', color_category: 'Wheaten', behavior_trait: 'Fast', eye_variant: 'Beanie' },

  // Hatch Thunder × Lemon Grace = cross-breed 2nd gen
  { name: 'Storm Warrior', gender: 'Rooster', birthdate: '2024-10-15', sire: 'Hatch Thunder', dam: 'Lemon Grace', breed: 'Hatch', weight: '2.0', height: '51', leg_color: 'Green / Slate', color: 'Dark Red', color_category: 'Red', behavior_trait: 'Powerful', eye_variant: 'Sta. Cruz' },
  { name: 'Storm Queen', gender: 'Hen', birthdate: '2024-10-15', sire: 'Hatch Thunder', dam: 'Lemon Grace', breed: 'Hatch', weight: '1.6', height: '44', leg_color: 'Yellow', color: 'Wheaten', color_category: 'Wheaten', behavior_trait: 'Alert', eye_variant: 'Pearl' },

  // ═══ ARCHIVED & DECEASED EXAMPLES ═════════════════════════════════════════
  { name: 'Retired Champion', gender: 'Rooster', birthdate: '2023-01-15', sire: 'Iron Lemon', dam: 'Golden Pearl', breed: 'Lemon', weight: '2.5', height: '58', leg_color: 'Yellow', color: 'Black-Breasted Red', color_category: 'Red', behavior_trait: 'Calm', eye_variant: 'Pearl' },
  { name: 'Fallen Hero', gender: 'Rooster', birthdate: '2023-03-20', sire: 'Titan Sweater', dam: 'Sunrise Queen', breed: 'Sweater', weight: '2.2', height: '55', leg_color: 'White', color: 'Wheaten', color_category: 'Wheaten', behavior_trait: 'Brave', eye_variant: 'Beanie' },
];

// ─── MATCH RECORDS ──────────────────────────────────────────────────────────
type MatchDef = {
  entry_name: string; opponent: string; opponent_breed: string; location: string;
  type: string; outcome: string; date: string;
  post_fight_condition: string;
};

const MATCHES: MatchDef[] = [
  // ═══ LEMON STORM (Full Sib Family A) — 4 fights ═══════════════════════════
  { entry_name: 'Lemon Storm', opponent: 'Rival Kelso Express', opponent_breed: 'Kelso', location: 'Dingle Breeding Arena', type: 'Derby Match', outcome: 'Win', date: '2025-01-15', post_fight_condition: 'Fit / Recovered' },
  { entry_name: 'Lemon Storm', opponent: 'Rival Roundhead King', opponent_breed: 'Roundhead', location: 'Iloilo Coliseum', type: '3-Cock Derby', outcome: 'Win', date: '2025-02-20', post_fight_condition: 'Fit / Recovered' },
  { entry_name: 'Lemon Storm', opponent: 'Rival Hatch Warrior', opponent_breed: 'Hatch', location: 'Passi Sports Complex', type: 'Derby Match', outcome: 'Win', date: '2025-04-10', post_fight_condition: 'Fit / Recovered' },
  { entry_name: 'Lemon Storm', opponent: 'Rival Sweater Blaze', opponent_breed: 'Sweater', location: 'Janiuay Cockpit Arena', type: 'Special Championship', outcome: 'Loss', date: '2025-06-05', post_fight_condition: 'Severely Injured / Critical' },

  // ═══ LEMON BLAZE (Full Sib Family A) — 3 fights ═══════════════════════════
  { entry_name: 'Lemon Blaze', opponent: 'Rival Whitehackle Pro', opponent_breed: 'Whitehackle', location: 'Dingle Breeding Arena', type: 'Hack Match', outcome: 'Win', date: '2025-02-10', post_fight_condition: 'Fit / Recovered' },
  { entry_name: 'Lemon Blaze', opponent: 'Rival Kelso Express', opponent_breed: 'Kelso', location: 'Pototan Coliseum', type: '2-Cock Derby', outcome: 'Loss', date: '2025-03-25', post_fight_condition: 'Fit / Recovered' },
  { entry_name: 'Lemon Blaze', opponent: 'Rival Hatch Dominator', opponent_breed: 'Hatch', location: 'Santa Barbara Sports Complex', type: 'Derby Match', outcome: 'Win', date: '2025-05-18', post_fight_condition: 'Fit / Recovered' },

  // ═══ LEMON DUKE (Full Sib Family A) — 2 fights ════════════════════════════
  { entry_name: 'Lemon Duke', opponent: 'Rival Roundhead King', opponent_breed: 'Roundhead', location: 'Dumangas Cockpit Arena', type: 'Derby Match', outcome: 'Loss', date: '2025-03-10', post_fight_condition: 'Fit / Recovered' },
  { entry_name: 'Lemon Duke', opponent: 'Rival Sweater Blaze', opponent_breed: 'Sweater', location: 'Dingle Breeding Arena', type: 'Hack Match', outcome: 'Win', date: '2025-05-01', post_fight_condition: 'Fit / Recovered' },

  // ═══ SWEATER FLASH (Full Sib Family B) — 3 fights ═════════════════════════
  { entry_name: 'Sweater Flash', opponent: 'Rival Lemon Fighter', opponent_breed: 'Lemon', location: 'Iloilo Coliseum', type: '3-Cock Derby', outcome: 'Win', date: '2025-01-28', post_fight_condition: 'Fit / Recovered' },
  { entry_name: 'Sweater Flash', opponent: 'Rival Hatch Storm', opponent_breed: 'Hatch', location: 'Dingle Breeding Arena', type: 'Derby Match', outcome: 'Win', date: '2025-03-15', post_fight_condition: 'Fit / Recovered' },
  { entry_name: 'Sweater Flash', opponent: 'Rival Kelso Express', opponent_breed: 'Kelso', location: 'San Enrique Arena', type: 'Special Championship', outcome: 'Loss', date: '2025-05-20', post_fight_condition: 'Deceased (Died from injuries)' },

  // ═══ SWEATER BOLT (Full Sib Family B) — 3 fights ══════════════════════════
  { entry_name: 'Sweater Bolt', opponent: 'Rival Whitehackle Pro', opponent_breed: 'Whitehackle', location: 'Passi Sports Complex', type: 'Derby Match', outcome: 'Win', date: '2025-02-05', post_fight_condition: 'Fit / Recovered' },
  { entry_name: 'Sweater Bolt', opponent: 'Rival Hatch Dominator', opponent_breed: 'Hatch', location: 'Dingle Breeding Arena', type: 'Hack Match', outcome: 'Win', date: '2025-04-02', post_fight_condition: 'Severely Injured / Critical' },
  { entry_name: 'Sweater Bolt', opponent: 'Rival Roundhead King', opponent_breed: 'Roundhead', location: 'Janiuay Cockpit Arena', type: '2-Cock Derby', outcome: 'Win', date: '2025-06-12', post_fight_condition: 'Fit / Recovered' },

  // ═══ HATCH THUNDER (Full Sib Family C) — 3 fights ═════════════════════════
  { entry_name: 'Hatch Thunder', opponent: 'Rival Kelso Express', opponent_breed: 'Kelso', location: 'Dingle Breeding Arena', type: 'Derby Match', outcome: 'Win', date: '2025-02-18', post_fight_condition: 'Fit / Recovered' },
  { entry_name: 'Hatch Thunder', opponent: 'Rival Sweater Blaze', opponent_breed: 'Sweater', location: 'Pototan Coliseum', type: '3-Cock Derby', outcome: 'Win', date: '2025-04-22', post_fight_condition: 'Fit / Recovered' },
  { entry_name: 'Hatch Thunder', opponent: 'Rival Whitehackle Pro', opponent_breed: 'Whitehackle', location: 'Iloilo Coliseum', type: 'Special Championship', outcome: 'Loss', date: '2025-06-01', post_fight_condition: 'Severely Injured / Critical' },

  // ═══ HATCH STORM (Full Sib Family C) — 2 fights ════════════════════════════
  { entry_name: 'Hatch Storm', opponent: 'Rival Lemon Fighter', opponent_breed: 'Lemon', location: 'Dumangas Cockpit Arena', type: 'Derby Match', outcome: 'Win', date: '2025-03-08', post_fight_condition: 'Fit / Recovered' },
  { entry_name: 'Hatch Storm', opponent: 'Rival Roundhead King', opponent_breed: 'Roundhead', location: 'Santa Barbara Sports Complex', type: 'Hack Match', outcome: 'Loss', date: '2025-05-15', post_fight_condition: 'Fit / Recovered' },

  // ═══ HALF-SIBS VIA SIRE: Lemon-Sweater Cross (Iron Lemon × Sunrise Queen) ═
  { entry_name: 'Lemon-Sweater Cross', opponent: 'Rival Hatch Warrior', opponent_breed: 'Hatch', location: 'Dingle Breeding Arena', type: 'Derby Match', outcome: 'Win', date: '2025-02-25', post_fight_condition: 'Fit / Recovered' },
  { entry_name: 'Lemon-Sweater Cross', opponent: 'Rival Kelso Express', opponent_breed: 'Kelso', location: 'Passi Sports Complex', type: '2-Cock Derby', outcome: 'Win', date: '2025-04-15', post_fight_condition: 'Fit / Recovered' },

  // ═══ HALF-SIBS VIA SIRE: Sweater Gold (Titan Sweater × Golden Pearl) ═══════
  { entry_name: 'Sweater Gold', opponent: 'Rival Whitehackle Pro', opponent_breed: 'Whitehackle', location: 'Janiuay Cockpit Arena', type: 'Derby Match', outcome: 'Loss', date: '2025-03-20', post_fight_condition: 'Fit / Recovered' },
  { entry_name: 'Sweater Gold', opponent: 'Rival Lemon Fighter', opponent_breed: 'Lemon', location: 'Dingle Breeding Arena', type: 'Hack Match', outcome: 'Win', date: '2025-05-10', post_fight_condition: 'Fit / Recovered' },

  // ═══ HALF-SIBS VIA DAM: Sweater-Lemon Blend (Titan Sweater × Golden Pearl) ═
  { entry_name: 'Sweater-Lemon Blend', opponent: 'Rival Hatch Dominator', opponent_breed: 'Hatch', location: 'San Enrique Arena', type: 'Derby Match', outcome: 'Win', date: '2025-03-05', post_fight_condition: 'Fit / Recovered' },
  { entry_name: 'Sweater-Lemon Blend', opponent: 'Rival Roundhead King', opponent_breed: 'Roundhead', location: 'Dingle Breeding Arena', type: '3-Cock Derby', outcome: 'Loss', date: '2025-05-25', post_fight_condition: 'Fit / Recovered' },

  // ═══ HALF-SIBS VIA DAM: Lemon-Mountain (Iron Lemon × Mountain Rose) ════════
  { entry_name: 'Lemon-Mountain', opponent: 'Rival Sweater Blaze', opponent_breed: 'Sweater', location: 'Iloilo Coliseum', type: 'Derby Match', outcome: 'Win', date: '2025-04-08', post_fight_condition: 'Fit / Recovered' },
  { entry_name: 'Lemon-Mountain', opponent: 'Rival Kelso Express', opponent_breed: 'Kelso', location: 'Dingle Breeding Arena', type: 'Special Championship', outcome: 'Win', date: '2025-06-15', post_fight_condition: 'Deceased (Died from injuries)' },

  // ═══ 2ND GEN: Elite Thunder (Lemon Storm × Sweater Angel) ══════════════════
  { entry_name: 'Elite Thunder', opponent: 'Rival Hatch Storm', opponent_breed: 'Hatch', location: 'Dingle Breeding Arena', type: 'Derby Match', outcome: 'Win', date: '2025-05-05', post_fight_condition: 'Fit / Recovered' },
  { entry_name: 'Elite Thunder', opponent: 'Rival Whitehackle Pro', opponent_breed: 'Whitehackle', location: 'Pototan Coliseum', type: 'Hack Match', outcome: 'Win', date: '2025-06-20', post_fight_condition: 'Fit / Recovered' },

  // ═══ 2ND GEN: Storm Warrior (Hatch Thunder × Lemon Grace) ══════════════════
  { entry_name: 'Storm Warrior', opponent: 'Rival Lemon Fighter', opponent_breed: 'Lemon', location: 'Dumangas Cockpit Arena', type: 'Derby Match', outcome: 'Win', date: '2025-05-12', post_fight_condition: 'Fit / Recovered' },
  { entry_name: 'Storm Warrior', opponent: 'Rival Kelso Express', opponent_breed: 'Kelso', location: 'Santa Barbara Sports Complex', type: '3-Cock Derby', outcome: 'Loss', date: '2025-06-18', post_fight_condition: 'Severely Injured / Critical' },

  // ═══ RETIRED CHAMPION — old fights ═════════════════════════════════════════
  { entry_name: 'Retired Champion', opponent: 'Rival Old Guard', opponent_breed: 'Sweater', location: 'Local Farm Pit', type: 'Main Event / Solo', outcome: 'Win', date: '2024-06-10', post_fight_condition: 'Fit / Recovered' },
  { entry_name: 'Retired Champion', opponent: 'Rival Old Guard', opponent_breed: 'Sweater', location: 'Local Farm Pit', type: 'Main Event / Solo', outcome: 'Win', date: '2024-09-15', post_fight_condition: 'Fit / Recovered' },
  { entry_name: 'Retired Champion', opponent: 'Rival Old Guard', opponent_breed: 'Sweater', location: 'Local Farm Pit', type: 'Main Event / Solo', outcome: 'Win', date: '2025-01-05', post_fight_condition: 'Fit / Recovered' },

  // ═══ FALLEN HERO — fights before deceased ══════════════════════════════════
  { entry_name: 'Fallen Hero', opponent: 'Rival Hatch Warrior', opponent_breed: 'Hatch', location: 'Dingle Breeding Arena', type: 'Derby Match', outcome: 'Win', date: '2024-07-20', post_fight_condition: 'Fit / Recovered' },
  { entry_name: 'Fallen Hero', opponent: 'Rival Kelso Express', opponent_breed: 'Kelso', location: 'Iloilo Coliseum', type: '3-Cock Derby', outcome: 'Win', date: '2024-11-10', post_fight_condition: 'Fit / Recovered' },
  { entry_name: 'Fallen Hero', opponent: 'Rival Whitehackle Pro', opponent_breed: 'Whitehackle', location: 'Passi Sports Complex', type: 'Special Championship', outcome: 'Win', date: '2025-02-28', post_fight_condition: 'Deceased (Died from injuries)' },
];

async function main() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║        GalloTrack Supabase Seed Script                  ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  // ─── 1. Create test user ────────────────────────────────────────────────
  console.log('1️⃣  Creating test user...');
  const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    email_confirm: true,
    user_metadata: {
      first_name: 'Farm',
      last_name: 'Owner',
      farm_name: TEST_FARM_NAME,
      contact_number: '09171234567',
    },
  });

  let userId: string;
  if (authErr) {
    // User may already exist — try to sign in
    console.log(`   ⚠️  User may already exist: ${authErr.message}`);
    console.log('   Trying to fetch existing user...');
    const { data: users } = await supabase.auth.admin.listUsers();
    const existing = users?.users?.find((u) => u.email === TEST_EMAIL);
    if (existing) {
      userId = existing.id;
      console.log(`   ✅ Found existing user: ${userId}`);
    } else {
      console.error('   ❌ Failed to create or find user. Aborting.');
      process.exit(1);
    }
  } else {
    userId = authData.user.id;
    console.log(`   ✅ Created user: ${userId}`);
  }

  // ─── 2. Clean existing data for this user ───────────────────────────────
  console.log('\n2️⃣  Cleaning existing data...');
  await supabase.from('match').delete().eq('user_id', userId);
  await supabase.from('fowl').delete().eq('user_id', userId);
  console.log('   ✅ Cleared old fowl and match records.');

  // ─── 3. Insert foundation sires ─────────────────────────────────────────
  console.log('\n3️⃣  Inserting foundation sires...');

  interface SeedFowlRow {
    user_id: string;
    name: string;
    breed: string;
    gender: string;
    color: string;
    color_category: string;
    growth_stage: string;
    behavior_trait: string;
    eye_variant: string;
    birthdate: string;
    age: string;
    weight: string;
    height: string;
    leg_color: string;
    sire: string;
    dam: string;
    sire_pct: number;
    dam_pct: number;
    bloodline_pct: number;
    status: string;
    image_url: string;
    archive_reason?: string;
    archive_date?: string;
    death_reason?: string;
    death_date?: string;
  }

  const fowlRows: SeedFowlRow[] = [];
  const birdMap = new Map<string, SeedFowlRow>();

  for (const s of FOUNDATION_SIRES) {
    const row = {
      user_id: userId,
      name: s.name,
      breed: s.breed,
      gender: s.gender,
      color: s.color,
      color_category: s.color_category,
      growth_stage: 'Cock',
      behavior_trait: s.behavior_trait,
      eye_variant: s.eye_variant,
      birthdate: s.birthdate,
      age: '24 Months',
      weight: `${s.weight} kg`,
      height: `${s.height} cm`,
      leg_color: s.leg_color,
      sire: 'Foundation Stock',
      dam: 'Foundation Stock',
      sire_pct: 0,
      dam_pct: 0,
      bloodline_pct: 100,
      status: 'Active',
      image_url: '',
    };
    fowlRows.push(row);
    birdMap.set(s.name, row);
  }

  // ─── 4. Insert foundation hens ──────────────────────────────────────────
  console.log('   Inserting foundation hens...');
  for (const h of FOUNDATION_HENS) {
    const row = {
      user_id: userId,
      name: h.name,
      breed: h.breed,
      gender: h.gender,
      color: h.color,
      color_category: h.color_category,
      growth_stage: 'Hen',
      behavior_trait: h.behavior_trait,
      eye_variant: h.eye_variant,
      birthdate: h.birthdate,
      age: '20 Months',
      weight: `${h.weight} kg`,
      height: `${h.height} cm`,
      leg_color: h.leg_color,
      sire: 'Foundation Stock',
      dam: 'Foundation Stock',
      sire_pct: 0,
      dam_pct: 0,
      bloodline_pct: 100,
      status: 'Active',
      image_url: '',
    };
    fowlRows.push(row);
    birdMap.set(h.name, row);
  }

  // ─── 5. Insert offspring ────────────────────────────────────────────────
  console.log('   Inserting offspring...');
  for (const o of OFFSPRING) {
    const sirePct = birdMap.get(o.sire)?.bloodline_pct ?? 100;
    const damPct = birdMap.get(o.dam)?.bloodline_pct ?? 100;
    const bloodlinePct = Math.round(((sirePct + damPct) / 2) * 100) / 100;

    const row = {
      user_id: userId,
      name: o.name,
      breed: o.breed,
      gender: o.gender,
      color: o.color,
      color_category: o.color_category,
      growth_stage: o.gender === 'Rooster' ? 'Cock' : 'Hen',
      behavior_trait: o.behavior_trait,
      eye_variant: o.eye_variant,
      birthdate: o.birthdate,
      age: '12 Months',
      weight: `${o.weight} kg`,
      height: `${o.height} cm`,
      leg_color: o.leg_color,
      sire: o.sire,
      dam: o.dam,
      sire_pct: sirePct,
      dam_pct: damPct,
      bloodline_pct: bloodlinePct,
      status: 'Active',
      image_url: '',
    };
    fowlRows.push(row);
    birdMap.set(o.name, row);
  }

  // ─── Mark special statuses ──────────────────────────────────────────────
  const retiredRow = birdMap.get('Retired Champion');
  if (retiredRow) {
    retiredRow.status = 'Archived';
    retiredRow.archive_reason = 'Retired from active competition';
    retiredRow.archive_date = '2025-03-01';
  }
  const fallenRow = birdMap.get('Fallen Hero');
  if (fallenRow) {
    fallenRow.status = 'Deceased';
    fallenRow.death_reason = 'Died from injuries after championship match';
    fallenRow.death_date = '2025-03-01';
  }

  // Bulk insert all fowl
  const { error: fowlInsertErr } = await supabase.from('fowl').insert(fowlRows);
  if (fowlInsertErr) {
    console.error('   ❌ Fowl insert error:', fowlInsertErr.message);
    process.exit(1);
  }
  console.log(`   ✅ Inserted ${fowlRows.length} fowl records.`);

  // ─── 6. Insert match records ────────────────────────────────────────────
  console.log('\n4️⃣  Inserting match records...');
  const matchRows = MATCHES.map((m) => ({
    user_id: userId,
    date: m.date,
    entry_name: m.entry_name,
    breed: birdMap.get(m.entry_name)?.breed || 'Unknown',
    opponent: m.opponent,
    opponent_breed: m.opponent_breed || '',
    location: m.location,
    type: m.type,
    outcome: m.outcome,
    status: 'Verified',
    post_fight_condition: m.post_fight_condition,
    video_url: null,
  }));

  const { error: matchInsertErr } = await supabase.from('match').insert(matchRows);
  if (matchInsertErr) {
    console.error('   ❌ Match insert error:', matchInsertErr.message);
    process.exit(1);
  }
  console.log(`   ✅ Inserted ${matchRows.length} match records.`);

  // ─── 7. Summary ────────────────────────────────────────────────────────
  const wins = MATCHES.filter((m) => m.outcome === 'Win').length;
  const losses = MATCHES.filter((m) => m.outcome === 'Loss').length;
  const deceased = MATCHES.filter((m) => m.post_fight_condition.includes('Deceased')).length;
  const critical = MATCHES.filter((m) => m.post_fight_condition.includes('Critical') || m.post_fight_condition.includes('Severely')).length;

  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║              SEED COMPLETED SUCCESSFULLY                ║');
  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log(`║  👤 User:       ${TEST_EMAIL}`);
  console.log(`║  🔑 Password:   ${TEST_PASSWORD}`);
  console.log('║');
  console.log(`║  🐓 Fowl Total: ${fowlRows.length}`);
  console.log(`║     Foundation Sires:     ${FOUNDATION_SIRES.length}`);
  console.log(`║     Foundation Hens:      ${FOUNDATION_HENS.length}`);
  console.log(`║     Full-Sib Family A:    4 (Iron Lemon × Golden Pearl)`);
  console.log(`║     Full-Sib Family B:    3 (Titan Sweater × Sunrise Queen)`);
  console.log(`║     Full-Sib Family C:    3 (True Hatch × Mountain Rose)`);
  console.log(`║     Half-Sibs via Sire:   4 (Iron Lemon × various, Titan Sweater × various)`);
  console.log(`║     Half-Sibs via Dam:    4 (Golden Pearl × various, Mountain Rose × various)`);
  console.log(`║     2nd Generation:       4 (cross-family grandchildren)`);
  console.log(`║     Special Status:       2 (1 Archived, 1 Deceased)`);
  console.log('║');
  console.log(`║  ⚔️  Matches Total: ${MATCHES.length}`);
  console.log(`║     Wins:          ${wins}`);
  console.log(`║     Losses:        ${losses}`);
  console.log(`║     Fit/Recovered: ${MATCHES.length - deceased - critical}`);
  console.log(`║     Critical:      ${critical}`);
  console.log(`║     Deceased:      ${deceased}`);
  console.log('║');
  console.log('║  📊 Sibling Groups You Can Analyze:');
  console.log('║     • Lemon Storm, Lemon Blaze, Lemon Grace, Lemon Duke');
  console.log('║       → Full siblings (same sire + same dam)');
  console.log('║     • Sweater Flash, Sweater Bolt, Sweater Angel');
  console.log('║       → Full siblings (same sire + same dam)');
  console.log('║     • Hatch Thunder, Hatch Storm, Hatch Rose');
  console.log('║       → Full siblings (same sire + same dam)');
  console.log('║     • Lemon-Sweater Cross, Lemon Silver');
  console.log('║       → Half-sibs via Sire (Iron Lemon, diff dams)');
  console.log('║     • Sweater Gold, Sweater Mountain');
  console.log('║       → Half-sibs via Sire (Titan Sweater, diff dams)');
  console.log('║     • Sweater-Lemon Blend, Hatch-Lemon Mix');
  console.log('║       → Half-sibs via Dam (Golden Pearl, diff sires)');
  console.log('║     • Lemon-Mountain, Sweater-Mountain');
  console.log('║       → Half-sibs via Dam (Mountain Rose, diff sires)');
  console.log('║');
  console.log('║  🌳 Parent Trees (tap to expand):');
  console.log('║     • Iron Lemon     → 6 offspring (Storm, Blaze, Duke, Cross, Silver, Mountain)');
  console.log('║     • Titan Sweater  → 5 offspring (Flash, Bolt, Angel, Gold, Mountain)');
  console.log('║     • True Hatch     → 3 offspring (Thunder, Storm, Rose)');
  console.log('║     • Golden Pearl   → 5 offspring (Storm, Blaze, Grace, Duke, Blend, Mix)');
  console.log('║     • Sunrise Queen  → 3 offspring (Flash, Bolt, Angel, Cross)');
  console.log('║     • Mountain Rose  → 4 offspring (Thunder, Storm, Rose, Lemon-Mountain, Sweater-Mountain)');
  console.log('╚══════════════════════════════════════════════════════════╝');
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
