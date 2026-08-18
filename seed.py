"""
GalloTrack Comprehensive Database Seeder.

Populates the SQLAlchemy database with comprehensive test scenarios:

  1. Fowl profiles & lineage (Sires / Dams / offspring) covering:
       - Foundation stock across Lemon, Sweater, Hatch breeds
       - Full-sibling families   (same Sire AND same Dam)
       - Half-siblings via Sire  (same Sire, different Dams)
       - Half-siblings via Dam   (same Dam, different Sires)
       - Recursive bloodline %   ((Sire% + Dam%) / 2, foundation = 100)
  2. Match records with:
       - WIN / LOSS outcomes
       - All post-fight health conditions (Fit / Critical / Deceased)
       - Mock video evidence URLs (MP4 / MOV) on winning records
         including the "won the fight but died from injuries" scenario
  3. Database integrity:
       - Clears existing test data safely before inserting
       - SQLAlchemy session management with rollback on failure
       - Confirmation message with populated totals

Usage:
    python seed.py            # prompts before wiping, full schema rebuild
    python seed.py --yes      # skip the confirmation prompt
    python seed.py --no-reset # keep schema, only delete rows + reseed
"""

import sys
from datetime import datetime, timedelta

from app import create_app
from database import db
from models import User, Gamefowl, Match


# ----------------------------------------------------------------------------
# Seed data definitions
# ----------------------------------------------------------------------------

BREEDS = ['Lemon', 'Sweater', 'Hatch']

POST_FIGHT_CONDITIONS = [
    'Fit / Recovered',
    'Severely Injured / Critical',
    'Deceased (Died from injuries)',
]

# Foundation stock: no parents, bloodline_pct = 100 (pure).
FOUNDATION = [
    # (name, breed, gender, age_months, bloodline_pct)
    ('Iron Lemon Stag',   'Lemon',   'Rooster', 36, 100.0),
    ('Titan Sweater Stag','Sweater', 'Rooster', 30, 100.0),
    ('True Hatch Stag',   'Hatch',   'Rooster', 28, 100.0),
    ('Golden Lemon Hen',  'Lemon',   'Hen',     24, 100.0),
    ('Sunrise Sweater Hen','Sweater','Hen',     22, 100.0),
    ('Mountain Hatch Hen', 'Hatch',  'Hen',     26, 100.0),
    # Imported foundation bird recorded at lower purity (75%) to exercise the
    # recursive formula producing non-uniform bloodline percentages.
    ('Imported Hatch Stag', 'Hatch', 'Rooster', 40, 75.0),
]

# Offspring spec: (name, gender, age_months, sire_key, dam_key)
# sire_key / dam_key reference names in the built birds dict (foundation + offspring).
OFFSPRING = [
    # --- Full-Sibling Family A (same Sire AND same Dam) ---
    ('Lemon Ace',   'Rooster', 12, 'Iron Lemon Stag', 'Golden Lemon Hen'),
    ('Lemon Jade',  'Hen',     12, 'Iron Lemon Stag', 'Golden Lemon Hen'),
    ('Lemon Duke',  'Rooster', 12, 'Iron Lemon Stag', 'Golden Lemon Hen'),
    # --- Half-Siblings via Sire (same Sire: Iron Lemon Stag, different Dam) ---
    ('Lemon-Sweater Cross', 'Rooster', 10, 'Iron Lemon Stag', 'Sunrise Sweater Hen'),
    ('Sunrise Lemon',       'Hen',     10, 'Iron Lemon Stag', 'Sunrise Sweater Hen'),
    # --- Half-Siblings via Dam (same Dam: Golden Lemon Hen, different Sire) ---
    ('Sweater-Lemon Blend', 'Rooster', 9, 'Titan Sweater Stag', 'Golden Lemon Hen'),
    ('Golden Sweater',      'Hen',     9, 'Titan Sweater Stag', 'Golden Lemon Hen'),
    # --- Full-Sibling Family B (Hatch) ---
    ('Hatch Dynamo', 'Rooster', 8, 'True Hatch Stag', 'Mountain Hatch Hen'),
    ('Hatch Fury',   'Rooster', 8, 'Imported Hatch Stag', 'Mountain Hatch Hen'),
    # --- Second generation (exercises recursion beyond foundation) ---
    ('Hatch Titan', 'Rooster', 6, 'Hatch Fury', 'Sunrise Sweater Hen'),
]

# Rival birds owned by a second user, used as match opponents.
RIVALS = [
    ('Rival Kelso Stag',      'Kelso',       'Rooster', 30),
    ('Rival Whitehackle Stag','Whitehackle', 'Rooster', 32),
]

# Match spec: (gamefowl1_key, gamefowl2_key, result_from_gamefowl1, days_ago,
#              post_fight_condition, video_filename_or_None)
# result is from the perspective of gamefowl1.
MATCHES = [
    ('Lemon Ace', 'Rival Kelso Stag', 'WIN', 90, 'Fit / Recovered', 'lemon-ace-vs-kelso.mp4'),
    ('Lemon Ace', 'Rival Whitehackle Stag', 'WIN', 80, 'Deceased (Died from injuries)', 'lemon-ace-vs-whitehackle.mp4'),
    ('Lemon Duke', 'Rival Kelso Stag', 'LOSS', 75, 'Fit / Recovered', None),
    ('Lemon Jade', 'Rival Whitehackle Stag', 'WIN', 70, 'Severely Injured / Critical', 'lemon-jade-vs-whitehackle.mov'),
    ('Lemon-Sweater Cross', 'Rival Kelso Stag', 'WIN', 60, 'Fit / Recovered', 'lemon-sweater-vs-kelso.mp4'),
    ('Sweater-Lemon Blend', 'Rival Whitehackle Stag', 'LOSS', 55, 'Fit / Recovered', None),
    ('Hatch Fury', 'Rival Kelso Stag', 'WIN', 45, 'Fit / Recovered', 'hatch-fury-vs-kelso.mov'),
    ('Hatch Titan', 'Rival Whitehackle Stag', 'WIN', 40, 'Deceased (Died from injuries)', 'hatch-titan-vs-whitehackle.mp4'),
    ('Hatch Dynamo', 'Rival Kelso Stag', 'LOSS', 30, 'Severely Injured / Critical', None),
    ('Sunrise Lemon', 'Rival Whitehackle Stag', 'WIN', 20, 'Fit / Recovered', 'sunrise-lemon-vs-whitehackle.mp4'),
    ('Golden Sweater', 'Rival Kelso Stag', 'LOSS', 10, 'Fit / Recovered', None),
    ('Lemon Ace', 'Rival Whitehackle Stag', 'LOSS', 5, 'Fit / Recovered', None),
]

VIDEO_BASE = 'https://storage.example.com/gallotrack/match-videos/'


def build_video_url(filename):
    """Return a mock video evidence URL (MP4/MOV)."""
    return f"{VIDEO_BASE}{filename}" if filename else None


def compute_bloodline_pct(birds, name):
    """
    Recursively compute bloodline percentage for a bird by name.

    Formula: Bloodline% = (Sire% + Dam%) / 2
        Foundation stock (no parents) -> 100% (or its recorded value).
    """
    bird = birds.get(name)
    if bird is None:
        raise KeyError(f"Unknown bird referenced: {name}")
    if not bird.sire_id and not bird.dam_id:
        return bird.bloodline_pct
    sire_pct = bird.sire.bloodline_pct if bird.sire_id else 0.0
    dam_pct = bird.dam.bloodline_pct if bird.dam_id else 0.0
    return round((sire_pct + dam_pct) / 2, 2)


def wipe_data(reset_schema):
    """Clear existing test data safely before inserting."""
    if reset_schema:
        db.drop_all()
        db.create_all()
        print('  [schema] Dropped and recreated all tables.')
    else:
        # FK-safe delete order: children before parents.
        Match.query.delete()
        Gamefowl.query.filter(Gamefowl.sire_id.isnot(None)).delete()
        Gamefowl.query.filter(Gamefowl.dam_id.isnot(None)).delete()
        Gamefowl.query.delete()
        User.query.delete()
        db.session.flush()
        print('  [schema] Deleted existing rows (schema kept intact).')


def seed():
    """Run the full seed routine within the Flask app context."""
    app = create_app()

    with app.app_context():
        reset_schema = '--no-reset' not in sys.argv
        wipe_data(reset_schema)

        # ------------------------------------------------------------------
        # 1. Users (owner + rival farm)
        # ------------------------------------------------------------------
        owner = User(username='farm_owner', email='owner@gallotrack.local')
        owner.set_password('owner123')

        rival = User(username='rival_farm', email='rival@gallotrack.local')
        rival.set_password('rival123')

        db.session.add_all([owner, rival])
        db.session.flush()

        # ------------------------------------------------------------------
        # 2. Foundation stock
        # ------------------------------------------------------------------
        birds = {}
        for name, breed, gender, age, pct in FOUNDATION:
            bird = Gamefowl(
                user_id=owner.id,
                name=name,
                breed=breed,
                gender=gender,
                age_months=age,
                status='Active',
                feather_color='Black-Breasted Red',
                leg_color='Yellow',
                weight_kg=round(1.8 + (age % 7) * 0.05, 2),
                height_inches=14 + (age % 5),
                bloodline_pct=pct,
            )
            birds[name] = bird
            db.session.add(bird)
        db.session.flush()

        # ------------------------------------------------------------------
        # 3. Offspring with explicit parentage
        # ------------------------------------------------------------------
        for name, gender, age, sire_key, dam_key in OFFSPRING:
            child = Gamefowl(
                user_id=owner.id,
                name=name,
                breed=birds[sire_key].breed,
                gender=gender,
                age_months=age,
                status='Active',
                feather_color='Wheaten',
                leg_color='Green',
                weight_kg=round(1.6 + (age % 6) * 0.05, 2),
                height_inches=13 + (age % 4),
                sire_id=birds[sire_key].id,
                dam_id=birds[dam_key].id,
                bloodline_pct=0.0,  # assigned below by the recursive formula
            )
            birds[name] = child
            db.session.add(child)
            # Flush per-bird so later offspring can reference this bird's ID
            # (covers multi-generation lineage like Hatch Titan -> Hatch Fury).
            db.session.flush()

        # Assign recursive bloodline percentages (parents already committed).
        for name, _, _, _, _ in OFFSPRING:
            birds[name].bloodline_pct = compute_bloodline_pct(birds, name)

        # ------------------------------------------------------------------
        # 4. Rival birds (opponents for matches)
        # ------------------------------------------------------------------
        for name, breed, gender, age in RIVALS:
            rival_bird = Gamefowl(
                user_id=rival.id,
                name=name,
                breed=breed,
                gender=gender,
                age_months=age,
                status='Active',
                feather_color='Dark Cornish',
                leg_color='White',
                weight_kg=round(2.0 + (age % 5) * 0.04, 2),
                height_inches=15 + (age % 3),
                bloodline_pct=100.0,
            )
            birds[name] = rival_bird
            db.session.add(rival_bird)
        db.session.flush()

        # ------------------------------------------------------------------
        # 5. Match records (outcome + post-fight condition + video evidence)
        # ------------------------------------------------------------------
        now = datetime.utcnow()
        match_count = 0
        for key1, key2, result, days_ago, condition, video in MATCHES:
            match = Match(
                user_id=owner.id,
                gamefowl1_id=birds[key1].id,
                gamefowl2_id=birds[key2].id,
                result=result,
                date=now - timedelta(days=days_ago),
                notes=f'Seeded test match: {key1} vs {key2} ({result})',
                post_fight_condition=condition,
                video_url=build_video_url(video),
            )
            db.session.add(match)
            match_count += 1

        # ------------------------------------------------------------------
        # 6. Commit transaction
        # ------------------------------------------------------------------
        try:
            db.session.commit()
        except Exception as exc:
            db.session.rollback()
            print(f'\nERROR: Seed failed, transaction rolled back: {exc}')
            sys.exit(1)

        # ------------------------------------------------------------------
        # 7. Confirmation summary
        # ------------------------------------------------------------------
        print('\n============================================================')
        print(' GalloTrack Database Seed Completed Successfully')
        print('============================================================')
        print(f' Users            : {User.query.count()}')
        print(f' Gamefowl         : {Gamefowl.query.count()}  (owned: {Gamefowl.query.filter_by(user_id=owner.id).count()}, rivals: {Gamefowl.query.filter_by(user_id=rival.id).count()})')
        print(f' Matches          : {match_count}')
        print(f'   - Wins         : {Match.query.filter_by(result="WIN").count()}')
        print(f'   - Losses       : {Match.query.filter_by(result="LOSS").count()}')
        print('   - Post-Fight Conditions:')
        for cond in POST_FIGHT_CONDITIONS:
            print(f'       {cond:32s}: {Match.query.filter_by(post_fight_condition=cond).count()}')
        print(f'   - With Video Evidence  : {Match.query.filter(Match.video_url.isnot(None)).count()}')

        print('\n Lineage / Bloodline Purity:')
        for name, _, _, _, _ in OFFSPRING:
            b = birds[name]
            print(f'   {name:22s} {b.breed:8s} sire={b.sire.name if b.sire else "-":20s} dam={b.dam.name if b.dam else "-":20s} bloodline={b.bloodline_pct}%')
        print('============================================================\n')


if __name__ == '__main__':
    seed()
