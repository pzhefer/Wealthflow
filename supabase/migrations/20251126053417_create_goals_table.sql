/*
  # Create Goals Table

  1. New Tables
    - goals: Financial goals tracking (savings, debt payoff, investment targets)

  2. Changes
    - Add goals table with target amounts and deadlines
    - Track progress towards each goal
    - Support different goal types

  3. Security
    - Enable RLS on goals table
    - Users can only access their own goals

  4. Features
    - Goal types: savings, debt_payoff, investment, purchase, emergency_fund, retirement
    - Track current amount vs target amount
    - Set target date for completion
    - Optional linked account
*/

-- Create goals table
CREATE TABLE IF NOT EXISTS goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text DEFAULT '',
  type text NOT NULL CHECK (type IN ('savings', 'debt_payoff', 'investment', 'purchase', 'emergency_fund', 'retirement', 'other')),
  target_amount numeric NOT NULL,
  current_amount numeric DEFAULT 0,
  target_date date,
  account_id uuid REFERENCES accounts(id) ON DELETE SET NULL,
  is_completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own goals"
  ON goals FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own goals"
  ON goals FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own goals"
  ON goals FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own goals"
  ON goals FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_type ON goals(type);
CREATE INDEX IF NOT EXISTS idx_goals_is_completed ON goals(is_completed);