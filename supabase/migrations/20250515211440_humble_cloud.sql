/*
  # Fix health assessment null constraint

  1. Changes
    - Add previous_healthspan column to health_assessments table
    - Update update_health_assessment function to handle previous_healthspan
    
  2. Security
    - Maintains existing RLS policies
*/

-- Add previous_healthspan column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'health_assessments' 
    AND column_name = 'previous_healthspan'
  ) THEN
    ALTER TABLE health_assessments 
    ADD COLUMN previous_healthspan integer NOT NULL DEFAULT 0;
  END IF;
END $$;

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS update_health_assessment(
  p_user_id uuid,
  p_expected_lifespan integer,
  p_expected_healthspan integer,
  p_gender text,
  p_health_score numeric,
  p_mindset_score numeric,
  p_sleep_score numeric,
  p_exercise_score numeric,
  p_nutrition_score numeric,
  p_biohacking_score numeric,
  p_created_at timestamptz,
  p_health_goals text
);

-- Create updated function with previous_healthspan handling
CREATE OR REPLACE FUNCTION update_health_assessment(
  p_user_id uuid,
  p_expected_lifespan integer,
  p_expected_healthspan integer,
  p_gender text,
  p_health_score numeric,
  p_mindset_score numeric,
  p_sleep_score numeric,
  p_exercise_score numeric,
  p_nutrition_score numeric,
  p_biohacking_score numeric,
  p_created_at timestamptz,
  p_health_goals text
) RETURNS void AS $$
DECLARE
  v_previous_healthspan integer;
BEGIN
  -- Get previous healthspan or default to expected_healthspan if none exists
  SELECT COALESCE(
    (SELECT expected_healthspan 
     FROM health_assessments 
     WHERE user_id = p_user_id 
     ORDER BY created_at DESC 
     LIMIT 1),
    p_expected_healthspan
  ) INTO v_previous_healthspan;

  -- Insert new health assessment
  INSERT INTO health_assessments (
    user_id,
    expected_lifespan,
    expected_healthspan,
    health_score,
    healthspan_years,
    previous_healthspan,
    mindset_score,
    sleep_score,
    exercise_score,
    nutrition_score,
    biohacking_score,
    created_at,
    user_name,
    health_goals,
    gender
  ) VALUES (
    p_user_id,
    p_expected_lifespan,
    p_expected_healthspan,
    p_health_score,
    0, -- Initial healthspan_years
    v_previous_healthspan,
    p_mindset_score,
    p_sleep_score,
    p_exercise_score,
    p_nutrition_score,
    p_biohacking_score,
    p_created_at,
    (SELECT name FROM users WHERE id = p_user_id),
    p_health_goals,
    p_gender
  );

  -- Update user profile with latest values
  UPDATE users
  SET 
    health_score = p_health_score,
    healthspan = p_expected_healthspan,
    lifespan = p_expected_lifespan,
    onboarding_completed = true,
    updated_at = now()
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql;