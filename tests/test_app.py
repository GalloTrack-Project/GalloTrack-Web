"""
GalloTrack Flask Backend Tests
Run with: pytest tests/ -v
"""
import pytest
from app import create_app
from database import db
from models import User, Gamefowl, Match


@pytest.fixture
def app():
    """Create application for testing."""
    app = create_app('testing')
    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()


@pytest.fixture
def client(app):
    """Create test client."""
    return app.test_client()


@pytest.fixture
def runner(app):
    """Create test runner."""
    return app.test_cli_runner()


@pytest.fixture
def test_user(app):
    """Create a test user."""
    with app.app_context():
        user = User(username='testuser', email='test@example.com')
        user.set_password('testpass123')
        db.session.add(user)
        db.session.commit()
        return user.id


class TestAuthRoutes:
    """Test authentication routes."""

    def test_register_page_loads(self, client):
        """Test registration page returns 200."""
        resp = client.get('/auth/register')
        assert resp.status_code == 200

    def test_login_page_loads(self, client):
        """Test login page returns 200."""
        resp = client.get('/auth/login')
        assert resp.status_code == 200

    def test_dashboard_redirects_when_not_logged_in(self, client):
        """Test dashboard redirects to login when not authenticated."""
        resp = client.get('/')
        assert resp.status_code == 302
        assert 'login' in resp.headers['Location']

    def test_register_new_user(self, client):
        """Test user registration."""
        resp = client.post('/auth/register', data={
            'username': 'newuser',
            'email': 'new@example.com',
            'password': 'password123',
            'password_confirm': 'password123'
        }, follow_redirects=True)
        assert resp.status_code == 200

    def test_login_valid_credentials(self, client, test_user):
        """Test login with valid credentials."""
        resp = client.post('/auth/login', data={
            'email': 'test@example.com',
            'password': 'testpass123'
        }, follow_redirects=True)
        assert resp.status_code == 200

    def test_login_invalid_credentials(self, client, test_user):
        """Test login with invalid credentials."""
        resp = client.post('/auth/login', data={
            'email': 'test@example.com',
            'password': 'wrongpassword'
        }, follow_redirects=True)
        assert resp.status_code == 200

    def test_logout(self, client, test_user):
        """Test logout clears session."""
        # Login first
        client.post('/auth/login', data={
            'email': 'test@example.com',
            'password': 'testpass123'
        })
        # Logout
        resp = client.get('/auth/logout', follow_redirects=True)
        assert resp.status_code == 200


class TestModels:
    """Test database models."""

    def test_user_creation(self, app):
        """Test user model creation."""
        with app.app_context():
            user = User(username='modeltest', email='model@test.com')
            user.set_password('pass123')
            db.session.add(user)
            db.session.commit()
            assert user.id is not None
            assert user.check_password('pass123')
            assert not user.check_password('wrong')

    def test_gamefowl_creation(self, app, test_user):
        """Test gamefowl model creation."""
        with app.app_context():
            bird = Gamefowl(
                user_id=test_user,
                name='Test Bird',
                breed='Sweater',
                gender='Rooster',
                age_months=12,
                status='Active'
            )
            db.session.add(bird)
            db.session.commit()
            assert bird.id is not None
            assert bird.bloodline_pct == 100.0

    def test_gamefowl_winning_percentage(self, app, test_user):
        """Test winning percentage calculation."""
        with app.app_context():
            bird = Gamefowl(
                user_id=test_user,
                name='WinTest',
                breed='Lemon',
                gender='Rooster',
                age_months=12,
                status='Active'
            )
            db.session.add(bird)
            db.session.commit()
            # No matches = 0%
            assert bird.get_winning_percentage() == 0.0

    def test_gamefowl_match_record(self, app, test_user):
        """Test match record calculation."""
        with app.app_context():
            bird = Gamefowl(
                user_id=test_user,
                name='RecordTest',
                breed='Hatch',
                gender='Hen',
                age_months=10,
                status='Active'
            )
            db.session.add(bird)
            db.session.commit()
            record = bird.get_match_record()
            assert record['wins'] == 0
            assert record['losses'] == 0
            assert record['draws'] == 0
            assert record['total'] == 0


class TestErrorHandlers:
    """Test error handlers."""

    def test_404_page(self, client):
        """Test 404 error page."""
        resp = client.get('/nonexistent-page')
        assert resp.status_code == 404
