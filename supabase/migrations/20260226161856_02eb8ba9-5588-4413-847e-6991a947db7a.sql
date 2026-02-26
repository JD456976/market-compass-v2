
-- Update email in auth.users
UPDATE auth.users 
SET email = 'jason.craig@chinattirealty.com',
    raw_user_meta_data = raw_user_meta_data || '{"email": "jason.craig@chinattirealty.com"}'::jsonb
WHERE id = '67560e64-76b9-4421-be25-305f5efdfbf2';

-- Update email in profiles table
UPDATE public.profiles 
SET email = 'jason.craig@chinattirealty.com'
WHERE user_id = '67560e64-76b9-4421-be25-305f5efdfbf2';
