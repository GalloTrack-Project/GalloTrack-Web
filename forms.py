from flask_wtf import FlaskForm
from wtforms import StringField, PasswordField, SubmitField, SelectField, IntegerField, FloatField, TextAreaField
from wtforms.validators import DataRequired, Email, EqualTo, ValidationError, Optional, Length, NumberRange
from models import User, Gamefowl


class LoginForm(FlaskForm):
    """Form for user login."""

    email = StringField('Email', validators=[
        DataRequired(message='Email is required'),
        Email(message='Invalid email address')
    ])
    password = PasswordField('Password', validators=[
        DataRequired(message='Password is required')
    ])
    submit = SubmitField('Sign In')


class RegistrationForm(FlaskForm):
    """Form for user registration."""

    username = StringField('Username', validators=[
        DataRequired(message='Username is required'),
        Length(min=3, max=80, message='Username must be between 3 and 80 characters')
    ])
    email = StringField('Email', validators=[
        DataRequired(message='Email is required'),
        Email(message='Invalid email address')
    ])
    password = PasswordField('Password', validators=[
        DataRequired(message='Password is required'),
        Length(min=6, message='Password must be at least 6 characters long')
    ])
    password_confirm = PasswordField('Confirm Password', validators=[
        DataRequired(message='Password confirmation is required'),
        EqualTo('password', message='Passwords must match')
    ])
    submit = SubmitField('Register')

    def validate_username(self, field):
        """Check if username is already taken."""
        if User.query.filter_by(username=field.data).first():
            raise ValidationError('Username is already taken.')

    def validate_email(self, field):
        """Check if email is already registered."""
        if User.query.filter_by(email=field.data).first():
            raise ValidationError('Email is already registered.')


class GamefowlForm(FlaskForm):
    """Form for adding/editing gamefowl profiles."""

    # Basic Information
    name = StringField('Name/Ring ID', validators=[
        DataRequired(message='Name is required'),
        Length(min=1, max=120, message='Name must be between 1 and 120 characters')
    ])

    breed = StringField('Breed (Rasa)', validators=[
        DataRequired(message='Breed is required'),
        Length(min=1, max=100, message='Breed must be between 1 and 100 characters')
    ])

    gender = SelectField('Gender', choices=[
        ('', 'Select Gender'),
        ('Rooster', 'Rooster'),
        ('Hen', 'Hen')
    ], validators=[DataRequired(message='Gender is required')])

    age_months = IntegerField('Age (Months)', validators=[
        DataRequired(message='Age is required'),
        NumberRange(min=0, max=120, message='Age must be between 0 and 120 months')
    ])

    status = SelectField('Status', choices=[
        ('Active', 'Active'),
        ('Breeding Stock', 'Breeding Stock'),
        ('Archived', 'Archived')
    ], validators=[DataRequired(message='Status is required')])

    # Physical Characteristics
    feather_color = StringField('Feather Color', validators=[
        Optional(),
        Length(max=100, message='Feather color must be less than 100 characters')
    ])

    leg_color = StringField('Leg Color', validators=[
        Optional(),
        Length(max=100, message='Leg color must be less than 100 characters')
    ])

    weight_kg = FloatField('Weight (kg)', validators=[
        Optional(),
        NumberRange(min=0, max=10, message='Weight should be between 0 and 10 kg')
    ])

    height_inches = IntegerField('Height (inches)', validators=[
        Optional(),
        NumberRange(min=0, max=36, message='Height should be between 0 and 36 inches')
    ])

    # Genealogy
    sire_id = SelectField('Sire ID (Father)', choices=[], validators=[Optional()], coerce=int)
    dam_id = SelectField('Dam ID (Mother)', choices=[], validators=[Optional()], coerce=int)

    # Additional
    notes = TextAreaField('Notes', validators=[
        Optional(),
        Length(max=1000, message='Notes must be less than 1000 characters')
    ])

    submit = SubmitField('Save Gamefowl Profile')

    def __init__(self, *args, **kwargs):
        """Initialize form with parent choices."""
        super(GamefowlForm, self).__init__(*args, **kwargs)
        # Choices will be set dynamically in route to get current user's gamefowl


class MatchForm(FlaskForm):
    """Form for logging match results."""

    gamefowl1_id = SelectField('Your Gamefowl', choices=[], validators=[
        DataRequired(message='Your gamefowl is required')
    ], coerce=int)

    gamefowl2_id = SelectField('Opponent Gamefowl', choices=[], validators=[
        DataRequired(message='Opponent gamefowl is required')
    ], coerce=int)

    result = SelectField('Result (from your bird perspective)', choices=[
        ('', 'Select Result'),
        ('WIN', 'WIN'),
        ('LOSS', 'LOSS'),
        ('DRAW', 'DRAW')
    ], validators=[DataRequired(message='Result is required')])

    match_date = StringField('Match Date', validators=[
        DataRequired(message='Match date is required')
    ], description='YYYY-MM-DD')

    notes = TextAreaField('Notes', validators=[
        Optional(),
        Length(max=500, message='Notes must be less than 500 characters')
    ])

    submit = SubmitField('Log Match')

    def __init__(self, *args, **kwargs):
        """Initialize form with gamefowl choices."""
        super(MatchForm, self).__init__(*args, **kwargs)
        # Choices will be set dynamically in route


class SearchForm(FlaskForm):
    """Form for searching gamefowl."""

    search = StringField('Search by name or breed', validators=[
        Optional(),
        Length(max=100, message='Search term must be less than 100 characters')
    ])

    breed_filter = StringField('Filter by breed', validators=[
        Optional(),
        Length(max=100, message='Breed filter must be less than 100 characters')
    ])

    status_filter = SelectField('Filter by status', choices=[
        ('', 'All Statuses'),
        ('Active', 'Active'),
        ('Breeding Stock', 'Breeding Stock'),
        ('Archived', 'Archived')
    ], validators=[Optional()])

    submit = SubmitField('Search')
