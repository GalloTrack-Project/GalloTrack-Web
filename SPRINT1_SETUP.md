# GalloTrack - Gamefowl Management System

A web-based gamefowl management system built with Flask for tracking gamefowl profiles, parent-offspring relationships, and performance analytics.

## Sprint 1 Completion Summary

Sprint 1 delivers the **foundation layer** of GalloTrack with authentication and database integration:

### ✅ Completed Features
- **User Authentication**: Registration, login, logout with secure password hashing
- **Database Models**: User, Gamefowl, Match models with self-referencing genealogy
- **Form System**: Flask-WTF forms with validation for all user inputs
- **Dashboard**: Dynamic statistics (gamefowl count, matches, winning percentage)
- **Gamefowl Profiles**: Form to add new gamefowl with all 10 core metrics
- **Gamefowl Details**: Individual profile pages with lineage and match history
- **Data Persistence**: All form submissions save to PostgreSQL database
- **User Isolation**: Each user only sees their own gamefowl

### 📋 Installation & Setup

#### Prerequisites
- Python 3.8+
- PostgreSQL 12+ (or SQLite for quick testing)
- pip

#### Step 1: Clone & Install Dependencies
```bash
cd GalloTrack-Web
python -m venv venv

# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt
```

#### Step 2: Configure Environment
```bash
cp .env.example .env
# Edit .env and set:
# DATABASE_URL=postgresql://username:password@localhost:5432/gallotrack_dev
# SECRET_KEY=change-this-to-a-random-string
```

#### Step 3: Initialize Database
```bash
# Option A: PostgreSQL (Recommended)
createdb gallotrack_dev

# Option B: SQLite (Quick testing)
# The app will auto-create gallotrack.db

python -c "from app import app; from database import db; db.create_all(app=app.app_context())"
```

#### Step 4: Run Development Server
```bash
python app.py
```

Visit `http://localhost:5000` and register a new account to get started!

### 🧪 Testing Sprint 1 Checklist

- [ ] Server starts without errors: `python app.py`
- [ ] Dashboard shows login prompt when not authenticated
- [ ] Can register new user with email/password
- [ ] Can login with registered credentials
- [ ] Session persists across page reloads
- [ ] Add gamefowl form saves to database
- [ ] Gamefowl appears in list after submission
- [ ] Can view individual gamefowl detail page
- [ ] Logout clears session
- [ ] Dashboard shows correct statistics (real data, not hardcoded)

### 📁 Project Structure

```
GalloTrack-Web/
├── app.py                          # Main Flask application
├── config.py                       # Configuration management
├── database.py                     # Database initialization
├── models.py                       # SQLAlchemy ORM models
├── forms.py                        # Flask-WTF form definitions
├── requirements.txt                # Python dependencies
├── .env.example                    # Environment template
│
├── routes/
│   ├── __init__.py
│   └── auth.py                     # Authentication endpoints
│
├── templates/
│   ├── dashboard.html              # Dashboard with statistics
│   ├── profiles.html               # Gamefowl listing & form
│   ├── gamefowl_detail.html        # Individual profile page
│   ├── auth/
│   │   ├── login.html              # Login form
│   │   └── register.html           # Registration form
│   └── errors/
│       ├── 404.html                # Not found page
│       └── 500.html                # Server error page
```

### 🔒 Security Features (Sprint 1)
- ✅ Password hashing with Werkzeug
- ✅ CSRF protection with Flask-WTF
- ✅ User authentication with Flask-Login
- ✅ User isolation (each user owns their data)
- ✅ Prepared statements (SQLAlchemy prevents SQL injection)
- ✅ Session security with HTTPOnly cookies

### 🚀 Next Steps (Sprint 2)

Sprint 2 will add:
- Recursive bloodline calculation (Sire% + Dam% / 2)
- Match result logging and tracking
- Performance statistics calculations
- Parent-offspring relationship visualization
- Multi-generation lineage trees

### 📧 Support

For issues or questions, please consult the implementation plan at:
`C:\Users\angelica\claude\plans\encapsulated-brewing-pnueli.md`

---

**Created by**: Team GalloTrack at ISUFST
**Date**: 2026-06-03
**Version**: Sprint 1 (0.1.0)
