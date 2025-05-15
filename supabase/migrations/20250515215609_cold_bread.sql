/*
  # Add Preview Access and Burn Streak Challenge documents

  1. New Content
    - Adds documents for Preview Access and 45-Day Burn Streak Challenge
    - Includes detailed information about program benefits and requirements
    - Stores content in searchable format with proper metadata

  2. Schema
    - Uses existing documents table for content storage
    - Adds metadata for categorization and retrieval
*/

-- First check if documents table exists, create it if not
CREATE TABLE IF NOT EXISTS public.documents (
  id BIGSERIAL PRIMARY KEY,
  content TEXT,
  metadata JSONB,
  embedding VECTOR(3072)
);

-- Insert Preview Access document
INSERT INTO public.documents (content, metadata)
VALUES (
  'Preview Access Program

Preview Access is an exclusive program available to 100 Gobundance Members. The program includes the following benefits:

1. Free 60-day subscription with full access to all premium features
2. $300 in contest credits to enter contests and win prizes
3. 2,500 equity shares with a chance to win up to 100,000 more shares

This program is designed to provide early access to Health Rocket''s premium features and reward early adopters with equity opportunities.',
  jsonb_build_object(
    'type', 'program_info',
    'title', 'Preview Access Program',
    'category', 'onboarding',
    'created_at', now(),
    'updated_at', now()
  )
);

-- Insert 45-Day Burn Streak Challenge document
INSERT INTO public.documents (content, metadata)
VALUES (
  '45-Day Burn Streak Challenge

The 45-Day Burn Streak Challenge is a special opportunity for Preview Access members to secure equity shares and additional rewards.

Challenge Requirements:
Complete a 45-Day Burn Streak by earning at least 1 Fuel Point each day for 45 consecutive days. This challenge must be completed during the preview period of June 1 to July 30, 2025.

Rewards:
- Successful completion guarantees 2,500 equity shares
- Opportunity to win up to 100,000 additional shares based on performance
- Bonus shares will be awarded to players based on the longest Burn Streaks and/or most Fuel Points earned during the preview period

Alternative Eligibility:
Players who aren''t able to complete the 45-Day Burn Streak will still be eligible to win prizes from Health Rocket Wellness Partners based on their Fuel Points earned during the preview period.

This challenge is designed to encourage consistent engagement with the Health Rocket platform and reward dedicated users with significant equity opportunities.',
  jsonb_build_object(
    'type', 'challenge_info',
    'title', '45-Day Burn Streak Challenge',
    'category', 'onboarding',
    'duration_days', 45,
    'start_date', '2025-06-01',
    'end_date', '2025-07-30',
    'created_at', now(),
    'updated_at', now()
  )
);

-- Insert detailed information about equity shares program
INSERT INTO public.documents (content, metadata)
VALUES (
  'Health Rocket Equity Shares Program

As part of the Preview Access program, Health Rocket is offering equity shares to early adopters. This document outlines the details of this program.

Base Allocation:
- 2,500 equity shares are guaranteed to Preview Access members who complete the 45-Day Burn Streak Challenge

Bonus Allocation:
- Up to 100,000 additional shares may be awarded based on performance metrics
- Performance is measured by:
  1. Length of consecutive Burn Streaks
  2. Total Fuel Points earned during the preview period
  3. Completion of specific challenges and quests
  4. Overall engagement with the platform

Distribution Timeline:
- Initial 2,500 shares will be allocated upon successful completion of the 45-Day Burn Streak Challenge
- Bonus shares will be distributed at the end of the preview period (after July 30, 2025)
- All share allocations will be documented and communicated to recipients

Terms and Conditions:
- Shares represent equity in Health Rocket Ventures LLC
- Recipients will be required to complete necessary documentation for share issuance
- Tax implications may apply based on individual circumstances
- Health Rocket reserves the right to modify the program details with notice to participants',
  jsonb_build_object(
    'type', 'program_info',
    'title', 'Health Rocket Equity Shares Program',
    'category', 'onboarding',
    'related_to', 'Preview Access Program',
    'created_at', now(),
    'updated_at', now()
  )
);