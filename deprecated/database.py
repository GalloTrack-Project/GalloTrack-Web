from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager

# Initialize SQLAlchemy and LoginManager
db = SQLAlchemy()
login_manager = LoginManager()


def init_db(app):
    """Initialize database with Flask app."""
    db.init_app(app)
    login_manager.init_app(app)

    # Configure login manager
    login_manager.login_view = 'auth.login'
    login_manager.login_message = 'Please log in to access this page.'
    login_manager.login_message_category = 'info'

    # Create tables
    with app.app_context():
        db.create_all()

    return db, login_manager
