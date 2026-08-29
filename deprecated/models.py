from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from flask_login import UserMixin
from database import db, login_manager


class User(UserMixin, db.Model):
    """User model for authentication and data ownership."""

    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False, index=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    gamefowl = db.relationship('Gamefowl', backref='owner', lazy=True, cascade='all, delete-orphan')
    matches = db.relationship('Match', backref='user', lazy=True, cascade='all, delete-orphan')

    def __repr__(self):
        return f'<User {self.username}>'

    def set_password(self, password):
        """Hash and set password."""
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        """Check if provided password matches hash."""
        return check_password_hash(self.password_hash, password)


class Gamefowl(db.Model):
    """Gamefowl model for storing bird profiles with genealogy tracking."""

    __tablename__ = 'gamefowl'

    # Primary Key
    id = db.Column(db.Integer, primary_key=True)

    # User Relationship
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)

    # Basic Information
    name = db.Column(db.String(120), nullable=False)
    breed = db.Column(db.String(100), nullable=False)  # e.g., Lemon, Sweater, Hatch
    gender = db.Column(db.String(20), nullable=False)  # Rooster or Hen
    age_months = db.Column(db.Integer, nullable=False)
    status = db.Column(db.String(100), default='Active')  # Active, Breeding Stock, Archived

    # Physical Characteristics
    feather_color = db.Column(db.String(100))
    leg_color = db.Column(db.String(100))
    weight_kg = db.Column(db.Float)
    height_inches = db.Column(db.Integer)

    # Genealogy - Self-Referencing Foreign Keys
    sire_id = db.Column(db.Integer, db.ForeignKey('gamefowl.id'), nullable=True)
    dam_id = db.Column(db.Integer, db.ForeignKey('gamefowl.id'), nullable=True)

    # Bloodline Purity (recursive formula: (Sire% + Dam%) / 2; foundation stock = 100)
    bloodline_pct = db.Column(db.Float, default=100.0, nullable=False)

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    sire = db.relationship('Gamefowl', remote_side=[id], foreign_keys=[sire_id], backref='offspring_as_sire')
    dam = db.relationship('Gamefowl', remote_side=[id], foreign_keys=[dam_id], backref='offspring_as_dam')

    # Matches involving this gamefowl
    matches_as_gamefowl1 = db.relationship(
        'Match',
        foreign_keys='Match.gamefowl1_id',
        backref='bird1',
        cascade='all, delete-orphan'
    )
    matches_as_gamefowl2 = db.relationship(
        'Match',
        foreign_keys='Match.gamefowl2_id',
        backref='bird2',
        cascade='all, delete-orphan'
    )

    def __repr__(self):
        return f'<Gamefowl {self.name} ({self.breed})>'

    def get_full_name(self):
        """Get name with breed for display."""
        return f"{self.name} ({self.breed})"

    def get_winning_percentage(self):
        """Calculate winning percentage from match history."""
        all_matches = self.matches_as_gamefowl1 + self.matches_as_gamefowl2
        if not all_matches:
            return 0.0

        wins = sum(1 for match in self.matches_as_gamefowl1 if match.result == 'WIN') + \
               sum(1 for match in self.matches_as_gamefowl2 if match.result == 'LOSS')

        return (wins / len(all_matches)) * 100 if all_matches else 0.0

    def get_match_record(self):
        """Get match record (wins, losses, draws)."""
        all_matches = self.matches_as_gamefowl1 + self.matches_as_gamefowl2

        wins = sum(1 for match in self.matches_as_gamefowl1 if match.result == 'WIN') + \
               sum(1 for match in self.matches_as_gamefowl2 if match.result == 'LOSS')
        losses = sum(1 for match in self.matches_as_gamefowl1 if match.result == 'LOSS') + \
                 sum(1 for match in self.matches_as_gamefowl2 if match.result == 'WIN')
        draws = sum(1 for match in all_matches if match.result == 'DRAW')

        return {'wins': wins, 'losses': losses, 'draws': draws, 'total': len(all_matches)}


class Match(db.Model):
    """Match model for tracking gamefowl combat results."""

    __tablename__ = 'matches'

    id = db.Column(db.Integer, primary_key=True)

    # User Relationship
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)

    # Gamefowl Relationships
    gamefowl1_id = db.Column(db.Integer, db.ForeignKey('gamefowl.id'), nullable=False)
    gamefowl2_id = db.Column(db.Integer, db.ForeignKey('gamefowl.id'), nullable=False)

    # Match Results
    result = db.Column(db.String(20), nullable=False)  # WIN, LOSS, DRAW (from perspective of gamefowl1)
    date = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    notes = db.Column(db.Text)

    # Post-Fight Health / Condition Status
    post_fight_condition = db.Column(db.String(60), default='Fit / Recovered')
    # Video Evidence Upload URL (mock MP4/MOV paths allowed)
    video_url = db.Column(db.String(255))

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f'<Match {self.gamefowl1_id} vs {self.gamefowl2_id}: {self.result}>'


@login_manager.user_loader
def load_user(user_id):
    """Load user by ID for Flask-Login."""
    return User.query.get(int(user_id))
