/*
  # Update health assessment function to include gender parameter

  1. Changes
    - Drop existing update_health_assessment function
    - Create new version with gender parameter
    - Grant execute permission to public
*/

-- Drop the existing function
DROP FUNCTION IF EXISTS public.update_health_assessment(uuid, integer, integer, numeric, numeric, numeric, numeric, numeric, timestamp with time zone, text);

-- Create a new function with the gender parameter
CREATE OR REPLACE FUNCTION public.update_health_assessment(
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
    p_created_at timestamp with time zone,
    p_health_goals text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_result jsonb;
    v_assessment_id uuid;
    v_previous_healthspan integer;
    v_healthspan_years numeric(4,2);
BEGIN
    -- Get previous healthspan if exists
    SELECT expected_healthspan INTO v_previous_healthspan
    FROM health_assessments
    WHERE user_id = p_user_id
    ORDER BY created_at DESC
    LIMIT 1;

    -- Calculate healthspan years gained
    IF v_previous_healthspan IS NOT NULL THEN
        v_healthspan_years = p_expected_healthspan - v_previous_healthspan;
    ELSE
        v_healthspan_years = 0;
    END IF;

    -- Insert new health assessment
    INSERT INTO health_assessments (
        user_id,
        expected_lifespan,
        expected_healthspan,
        gender,
        health_score,
        healthspan_years,
        previous_healthspan,
        mindset_score,
        sleep_score,
        exercise_score,
        nutrition_score,
        biohacking_score,
        created_at,
        health_goals
    ) VALUES (
        p_user_id,
        p_expected_lifespan,
        p_expected_healthspan,
        p_gender,
        p_health_score,
        v_healthspan_years,
        v_previous_healthspan,
        p_mindset_score,
        p_sleep_score,
        p_exercise_score,
        p_nutrition_score,
        p_biohacking_score,
        p_created_at,
        p_health_goals
    )
    RETURNING id INTO v_assessment_id;

    -- Update user's health metrics
    UPDATE users
    SET 
        health_score = p_health_score,
        healthspan_years = v_healthspan_years,
        lifespan = p_expected_lifespan,
        healthspan = p_expected_healthspan
    WHERE id = p_user_id;

    -- Build result object
    v_result := jsonb_build_object(
        'success', true,
        'assessment_id', v_assessment_id,
        'healthspan_years', v_healthspan_years
    );

    RETURN v_result;
END;
$$;

-- Grant execute permission to public
GRANT EXECUTE ON FUNCTION public.update_health_assessment(uuid, integer, integer, text, numeric, numeric, numeric, numeric, numeric, numeric, timestamp with time zone, text) TO public;