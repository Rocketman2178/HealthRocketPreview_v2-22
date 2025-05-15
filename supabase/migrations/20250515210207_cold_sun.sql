/*
  # Add gender field to health_assessments table

  1. New Columns
    - `gender` (text, nullable) - Stores the user's gender selection (Male, Female, or Prefer Not To Say)
    
  2. Changes
    - Adds a new column to the existing health_assessments table
*/

-- Add gender column to health_assessments table
ALTER TABLE public.health_assessments 
ADD COLUMN gender text;

-- Add comment to explain the column
COMMENT ON COLUMN public.health_assessments.gender IS 'User''s gender selection (Male, Female, or Prefer Not To Say)';