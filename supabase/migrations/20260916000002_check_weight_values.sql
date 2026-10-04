-- Check all fowls and their current weight/height values
SELECT id, name, breed, weight, height, user_id
FROM fowl
ORDER BY created_at DESC;
