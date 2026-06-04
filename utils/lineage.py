"""
Lineage calculation utilities for GalloTrack.

This module contains recursive algorithms for calculating bloodline percentages
and tracking parent-offspring relationships across multiple generations.
"""

from models import Gamefowl
from database import db


def calculate_bloodline_percentage(gamefowl_id, max_generations=10):
    """
    Recursively calculate bloodline percentages for all ancestors.

    Formula: Bloodline% = (Sire% + Dam%) / 2
    This is applied recursively across generations.

    Args:
        gamefowl_id (int): ID of the gamefowl to analyze
        max_generations (int): Maximum generations to traverse (default: 10)

    Returns:
        dict: {
            'gamefowl_id': int,
            'sire_percentage': float,
            'dam_percentage': float,
            'total_percentage': float,
            'ancestors': list of ancestor dicts,
            'generations': int,
            'is_foundation': bool
        }

    Example:
        >>> result = calculate_bloodline_percentage(5)
        >>> print(result['sire_percentage'])  # 50.0
        >>> print(result['dam_percentage'])   # 50.0
    """
    gamefowl = Gamefowl.query.get(gamefowl_id)

    if not gamefowl:
        return {
            'gamefowl_id': gamefowl_id,
            'sire_percentage': 0.0,
            'dam_percentage': 0.0,
            'total_percentage': 0.0,
            'ancestors': [],
            'generations': 0,
            'is_foundation': True,
            'error': 'Gamefowl not found'
        }

    # Base case: foundation stock (no parents)
    if not gamefowl.sire_id and not gamefowl.dam_id:
        return {
            'gamefowl_id': gamefowl_id,
            'name': gamefowl.name,
            'breed': gamefowl.breed,
            'sire_percentage': 0.0,
            'dam_percentage': 0.0,
            'total_percentage': 0.0,
            'ancestors': [],
            'generations': 0,
            'is_foundation': True
        }

    # Recursive case: has one or both parents
    sire_percentage = 0.0
    dam_percentage = 0.0
    ancestors = []
    max_gen_depth = 0

    # Calculate sire contribution (50% base, then split by sire's parents)
    if gamefowl.sire_id:
        sire_result = calculate_bloodline_percentage(gamefowl.sire_id, max_generations - 1)
        sire_percentage = 50.0  # Direct sire contribution
        ancestors.extend([{**a, 'contribution_type': 'sire'} for a in sire_result.get('ancestors', [])])
        max_gen_depth = max(max_gen_depth, sire_result.get('generations', 0) + 1)

        # Add the sire as an ancestor
        ancestors.insert(0, {
            'gamefowl_id': gamefowl.sire_id,
            'name': gamefowl.sire.name,
            'breed': gamefowl.sire.breed,
            'percentage': 50.0,
            'generation': 1,
            'contribution_type': 'sire'
        })

    # Calculate dam contribution (50% base, then split by dam's parents)
    if gamefowl.dam_id:
        dam_result = calculate_bloodline_percentage(gamefowl.dam_id, max_generations - 1)
        dam_percentage = 50.0  # Direct dam contribution
        ancestors.extend([{**a, 'contribution_type': 'dam'} for a in dam_result.get('ancestors', [])])
        max_gen_depth = max(max_gen_depth, dam_result.get('generations', 0) + 1)

        # Add the dam as an ancestor
        ancestors.insert(0, {
            'gamefowl_id': gamefowl.dam_id,
            'name': gamefowl.dam.name,
            'breed': gamefowl.dam.breed,
            'percentage': 50.0,
            'generation': 1,
            'contribution_type': 'dam'
        })

    total_percentage = sire_percentage + dam_percentage

    return {
        'gamefowl_id': gamefowl_id,
        'name': gamefowl.name,
        'breed': gamefowl.breed,
        'sire_percentage': sire_percentage,
        'dam_percentage': dam_percentage,
        'total_percentage': total_percentage,
        'ancestors': ancestors,
        'generations': max_gen_depth,
        'is_foundation': False
    }


def get_siblings(gamefowl_id):
    """
    Get all siblings (birds with same sire and/or dam).

    Args:
        gamefowl_id (int): ID of the gamefowl

    Returns:
        dict: {
            'full_siblings': list (same sire and dam),
            'half_siblings_sire': list (same sire only),
            'half_siblings_dam': list (same dam only)
        }
    """
    gamefowl = Gamefowl.query.get(gamefowl_id)

    if not gamefowl:
        return {
            'full_siblings': [],
            'half_siblings_sire': [],
            'half_siblings_dam': []
        }

    full_siblings = []
    half_siblings_sire = []
    half_siblings_dam = []

    if gamefowl.sire_id and gamefowl.dam_id:
        # Find full siblings (same sire AND dam)
        full_siblings = Gamefowl.query.filter(
            Gamefowl.id != gamefowl_id,
            Gamefowl.sire_id == gamefowl.sire_id,
            Gamefowl.dam_id == gamefowl.dam_id
        ).all()

        # Find half-siblings (same sire only)
        half_siblings_sire = Gamefowl.query.filter(
            Gamefowl.id != gamefowl_id,
            Gamefowl.sire_id == gamefowl.sire_id,
            Gamefowl.dam_id != gamefowl.dam_id
        ).all()

        # Find half-siblings (same dam only)
        half_siblings_dam = Gamefowl.query.filter(
            Gamefowl.id != gamefowl_id,
            Gamefowl.sire_id != gamefowl.sire_id,
            Gamefowl.dam_id == gamefowl.dam_id
        ).all()

    elif gamefowl.sire_id:
        # Only sire known, find all birds with same sire
        half_siblings_sire = Gamefowl.query.filter(
            Gamefowl.id != gamefowl_id,
            Gamefowl.sire_id == gamefowl.sire_id
        ).all()

    elif gamefowl.dam_id:
        # Only dam known, find all birds with same dam
        half_siblings_dam = Gamefowl.query.filter(
            Gamefowl.id != gamefowl_id,
            Gamefowl.dam_id == gamefowl.dam_id
        ).all()

    return {
        'full_siblings': [
            {
                'id': g.id,
                'name': g.name,
                'breed': g.breed,
                'gender': g.gender,
                'winning_percentage': g.get_winning_percentage()
            } for g in full_siblings
        ],
        'half_siblings_sire': [
            {
                'id': g.id,
                'name': g.name,
                'breed': g.breed,
                'gender': g.gender,
                'winning_percentage': g.get_winning_percentage()
            } for g in half_siblings_sire
        ],
        'half_siblings_dam': [
            {
                'id': g.id,
                'name': g.name,
                'breed': g.breed,
                'gender': g.gender,
                'winning_percentage': g.get_winning_percentage()
            } for g in half_siblings_dam
        ]
    }


def get_lineage_tree(gamefowl_id, direction='both', max_generations=5):
    """
    Get a complete lineage tree (ancestors and/or offspring).

    Args:
        gamefowl_id (int): ID of the gamefowl (root of tree)
        direction (str): 'ancestors', 'offspring', or 'both'
        max_generations (int): How many generations to include

    Returns:
        dict: Hierarchical tree structure
    """
    gamefowl = Gamefowl.query.get(gamefowl_id)

    if not gamefowl:
        return {'error': 'Gamefowl not found'}

    tree = {
        'root': {
            'id': gamefowl.id,
            'name': gamefowl.name,
            'breed': gamefowl.breed,
            'gender': gamefowl.gender,
            'winning_percentage': gamefowl.get_winning_percentage()
        }
    }

    # Get ancestors if requested
    if direction in ('ancestors', 'both'):
        tree['ancestors'] = _get_ancestors_tree(gamefowl, max_generations)

    # Get offspring if requested
    if direction in ('offspring', 'both'):
        tree['offspring'] = _get_offspring_tree(gamefowl, max_generations)

    return tree


def _get_ancestors_tree(gamefowl, max_generations, current_gen=0):
    """Helper function to recursively build ancestor tree."""
    if current_gen >= max_generations or (not gamefowl.sire_id and not gamefowl.dam_id):
        return {}

    ancestors = {}

    if gamefowl.sire_id:
        sire = Gamefowl.query.get(gamefowl.sire_id)
        ancestors['sire'] = {
            'id': sire.id,
            'name': sire.name,
            'breed': sire.breed,
            'gender': sire.gender,
            'winning_percentage': sire.get_winning_percentage(),
            'ancestors': _get_ancestors_tree(sire, max_generations, current_gen + 1)
        }

    if gamefowl.dam_id:
        dam = Gamefowl.query.get(gamefowl.dam_id)
        ancestors['dam'] = {
            'id': dam.id,
            'name': dam.name,
            'breed': dam.breed,
            'gender': dam.gender,
            'winning_percentage': dam.get_winning_percentage(),
            'ancestors': _get_ancestors_tree(dam, max_generations, current_gen + 1)
        }

    return ancestors


def _get_offspring_tree(gamefowl, max_generations, current_gen=0):
    """Helper function to recursively build offspring tree."""
    if current_gen >= max_generations:
        return []

    offspring_as_sire = gamefowl.offspring_as_sire
    offspring_as_dam = gamefowl.offspring_as_dam
    all_offspring = list(set(offspring_as_sire + offspring_as_dam))

    offspring_list = []
    for child in all_offspring:
        offspring_list.append({
            'id': child.id,
            'name': child.name,
            'breed': child.breed,
            'gender': child.gender,
            'role': 'sire' if child in offspring_as_sire else 'dam' if child in offspring_as_dam else 'both',
            'winning_percentage': child.get_winning_percentage(),
            'offspring': _get_offspring_tree(child, max_generations, current_gen + 1)
        })

    return offspring_list
