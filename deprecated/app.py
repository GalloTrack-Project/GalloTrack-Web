"""
DEPRECATED: This Flask backend is no longer the active frontend.
See FLASK_DEPRECATED.md for migration details.

The active application is the Next.js frontend in gallotrack-next/.
"""
import os
from flask import Flask, render_template, request, redirect, url_for, flash
from flask_login import login_required, current_user
from config import config, get_config
from database import db, login_manager, init_db
from models import Gamefowl, User, Match
from forms import GamefowlForm, SearchForm, MatchForm
from routes.auth import auth_bp


def create_app(config_name=None):
    """Application factory function."""
    if config_name is None:
        config_name = os.getenv('FLASK_ENV', 'development')

    app = Flask(__name__)
    app.config.from_object(config.get(config_name, get_config()))

    # Initialize database and login manager
    init_db(app)

    # Register blueprints
    app.register_blueprint(auth_bp)

    # Add current_user to template context (makes it available in all templates)
    @app.context_processor
    def inject_user():
        """Inject current_user into template context."""
        return {'current_user': current_user}

    # Routes
    @app.route('/')
    @app.route('/dashboard')
    def dashboard():
        """Dashboard view - shows overview statistics."""
        if not current_user.is_authenticated:
            return redirect(url_for('auth.login'))

        # Get user's gamefowl statistics
        gamefowl_count = Gamefowl.query.filter_by(user_id=current_user.id).count()
        matches_count = Match.query.filter_by(user_id=current_user.id).count()

        # Calculate average winning percentage
        user_gamefowl = Gamefowl.query.filter_by(user_id=current_user.id).all()
        if user_gamefowl:
            avg_winning_rate = sum(g.get_winning_percentage() for g in user_gamefowl) / len(user_gamefowl)
        else:
            avg_winning_rate = 0.0

        # Calculate win/loss/draw counts for charts
        user_matches = Match.query.filter_by(user_id=current_user.id).all()
        wins = sum(1 for m in user_matches if m.result == 'WIN')
        losses = sum(1 for m in user_matches if m.result == 'LOSS')
        draws = sum(1 for m in user_matches if m.result == 'DRAW')

        # Calculate wins by breed for bar chart
        breed_wins = {}
        for match in user_matches:
            bird1 = Gamefowl.query.get(match.gamefowl1_id)
            if bird1 and match.result == 'WIN':
                breed = bird1.breed
                breed_wins[breed] = breed_wins.get(breed, 0) + 1

        # Sort by wins descending and take top 5
        top_breeds = sorted(breed_wins.items(), key=lambda x: x[1], reverse=True)[:5]
        breed_labels = [b[0] for b in top_breeds] if top_breeds else ['No Data']
        breed_data = [b[1] for b in top_breeds] if top_breeds else [0]

        return render_template('dashboard.html',
                             gamefowl_count=gamefowl_count,
                             matches_count=matches_count,
                             avg_winning_rate=round(avg_winning_rate, 1),
                             wins=wins,
                             losses=losses,
                             draws=draws,
                             breed_labels=breed_labels,
                             breed_data=breed_data)

    @app.route('/profiles')
    @login_required
    def profiles():
        """Profiles view - list of gamefowl with form to add new ones."""
        form = GamefowlForm()

        # Populate parent choices with user's gamefowl
        user_gamefowl = Gamefowl.query.filter_by(user_id=current_user.id).all()
        sire_choices = [(0, '-- Unknown/Foundation Stock --')] + [(g.id, f"{g.name} ({g.breed})") for g in user_gamefowl]
        dam_choices = [(0, '-- Unknown/Foundation Stock --')] + [(g.id, f"{g.name} ({g.breed})") for g in user_gamefowl]

        form.sire_id.choices = sire_choices
        form.dam_id.choices = dam_choices

        if form.validate_on_submit():
            # Create new gamefowl
            gamefowl = Gamefowl(
                user_id=current_user.id,
                name=form.name.data,
                breed=form.breed.data,
                gender=form.gender.data,
                age_months=form.age_months.data,
                status=form.status.data,
                feather_color=form.feather_color.data,
                leg_color=form.leg_color.data,
                weight_kg=form.weight_kg.data,
                height_inches=form.height_inches.data,
                sire_id=form.sire_id.data if form.sire_id.data != 0 else None,
                dam_id=form.dam_id.data if form.dam_id.data != 0 else None
            )

            db.session.add(gamefowl)
            db.session.commit()

            flash(f'Gamefowl "{gamefowl.name}" ({gamefowl.breed}) has been added successfully!', 'success')
            return redirect(url_for('profiles'))

        # Get user's gamefowl for display
        gamefowl_list = Gamefowl.query.filter_by(user_id=current_user.id).order_by(Gamefowl.created_at.desc()).all()

        return render_template('profiles.html', form=form, gamefowl_list=gamefowl_list)

    @app.route('/gamefowl/<int:gamefowl_id>')
    @login_required
    def gamefowl_detail(gamefowl_id):
        """View individual gamefowl details."""
        gamefowl = Gamefowl.query.get_or_404(gamefowl_id)

        # Ensure user owns this gamefowl
        if gamefowl.user_id != current_user.id:
            flash('You do not have permission to view this gamefowl.', 'danger')
            return redirect(url_for('profiles'))

        return render_template('gamefowl_detail.html', gamefowl=gamefowl)

    @app.route('/add_fowl', methods=['POST'])
    @login_required
    def add_fowl():
        """Handle gamefowl form submission (backwards compatibility)."""
        form = GamefowlForm()

        if form.validate_on_submit():
            gamefowl = Gamefowl(
                user_id=current_user.id,
                name=form.name.data,
                breed=form.breed.data,
                gender=form.gender.data,
                age_months=form.age_months.data,
                status=form.status.data,
                feather_color=form.feather_color.data,
                leg_color=form.leg_color.data,
                weight_kg=form.weight_kg.data,
                height_inches=form.height_inches.data,
                sire_id=form.sire_id.data if form.sire_id.data != 0 else None,
                dam_id=form.dam_id.data if form.dam_id.data != 0 else None
            )

            db.session.add(gamefowl)
            db.session.commit()

            print("\n============================ NEW PROFILE ENCODED ============================")
            print(f"IDENTIFICATION : Name: {gamefowl.name} | Breed: {gamefowl.breed} | Gender: {gamefowl.gender}")
            print(f"DEMOGRAPHICS   : Age: {gamefowl.age_months} months | Feather Color: {gamefowl.feather_color} | Leg Color: {gamefowl.leg_color}")
            print(f"PHYSICAL SPECS : Weight: {gamefowl.weight_kg} kg | Height: {gamefowl.height_inches} inches")
            print(f"LINEAGE MAP    : Sire ID: {gamefowl.sire_id or 'None'} | Dam ID: {gamefowl.dam_id or 'None'}")
            print(f"SYSTEM STATUS  : {gamefowl.status}")
            print("=============================================================================\n")

            flash('Gamefowl profile has been saved!', 'success')
            return redirect(url_for('profiles'))

        return redirect(url_for('profiles'))

    # Error handlers
    @app.errorhandler(404)
    def not_found(error):
        app.logger.warning(f"404 Page Not Found: {request.path}")
        return render_template('errors/404.html'), 404

    @app.errorhandler(500)
    def server_error(error):
        app.logger.error(f"500 Internal Server Error encountered on {request.path}: {error}", exc_info=True)
        try:
            db.session.rollback()
        except Exception as e:
            app.logger.error(f"Failed to rollback DB session: {e}")
        return render_template('errors/500.html'), 500

    @app.errorhandler(Exception)
    def handle_unhandled_exception(error):
        app.logger.error(f"Unhandled Exception on {request.path}: {error}", exc_info=True)
        try:
            db.session.rollback()
        except Exception:
            pass
        return render_template('errors/500.html'), 500

    return app


# Create application instance
app = create_app()


if __name__ == '__main__':
    app.run(debug=True)
