-- Strip trailing " kg" from weight and " cm" from height
-- so existing rows match the new plain-number format.

UPDATE fowl
SET weight = regexp_replace(weight, '\s*kg$', '', 'gi')
WHERE weight ~ '\s*kg$';

UPDATE fowl
SET height = regexp_replace(height, '\s*cm$', '', 'gi')
WHERE height ~ '\s*cm$';
