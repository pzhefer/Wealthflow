/*
  # Create Recurring Transactions System

  ## Overview
  This migration creates a comprehensive recurring transactions system that allows users to:
  - Define transaction templates that repeat on schedules
  - Automatically generate transactions based on recurring rules
  - Track which transactions were generated from recurring rules
  - Manage active and paused recurring transactions

  ## 1. New Tables

  ### `recurring_transactions`
  The main table storing recurring transaction rules and templates.

  **Columns:**
  - `id` (uuid, primary key) - Unique identifier for the recurring rule
  - `user_id` (uuid, foreign key) - Owner of the recurring transaction
  - `name` (text) - Descriptive name for the recurring transaction
  - `amount` (numeric) - Transaction amount (positive for income, negative for expense)
  - `category` (text) - Category name for the transaction
  - `category_id` (uuid, foreign key) - Reference to categories table
  - `description` (text) - Transaction description
  - `type` (text) - Transaction type: 'income', 'expense', or 'transfer'
  - `account_id` (uuid, foreign key) - Source account
  - `to_account_id` (uuid, foreign key) - Destination account (for transfers)
  - `merchant_id` (uuid, foreign key) - Associated merchant
  - `frequency` (text) - How often it repeats: 'daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly'
  - `interval` (integer) - Multiplier for frequency (e.g., 2 = every 2 weeks)
  - `day_of_week` (integer) - For weekly: 0=Sunday, 6=Saturday
  - `day_of_month` (integer) - For monthly: 1-31
  - `start_date` (date) - When recurring transactions should start generating
  - `end_date` (date, nullable) - Optional end date (null = indefinite)
  - `next_occurrence` (date) - Next scheduled transaction date
  - `last_generated` (date, nullable) - Last date a transaction was generated
  - `is_active` (boolean) - Whether this rule is currently active
  - `auto_generate` (boolean) - Whether to auto-generate or require manual approval
  - `notes` (text) - Additional notes about the recurring transaction
  - `created_at` (timestamptz) - When the rule was created
  - `updated_at` (timestamptz) - Last update timestamp

  ## 2. Security
  - Enable RLS on all tables
  - Users can only access their own recurring transactions
  - Separate policies for SELECT, INSERT, UPDATE, DELETE

  ## 3. Constraints & Validation
  - Amount must be non-zero
  - Valid frequency values
  - Valid day_of_week (0-6) and day_of_month (1-31)
  - Start date required
  - End date must be after start date if provided

  ## 4. Indexes
  - Index on user_id for fast user queries
  - Index on next_occurrence for scheduled job lookups
  - Index on is_active for filtering active rules

  ## 5. Helper Functions
  - `calculate_next_occurrence()` - Calculates next transaction date
  - `generate_recurring_transaction()` - Creates transaction from rule
  - `generate_due_recurring_transactions()` - Batch generates all due transactions
*/

-- Create recurring_transactions table
CREATE TABLE IF NOT EXISTS recurring_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  amount numeric NOT NULL CHECK (amount != 0),
  category text NOT NULL,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  description text DEFAULT '',
  type text NOT NULL CHECK (type IN ('income', 'expense', 'transfer')),
  account_id uuid REFERENCES accounts(id) ON DELETE SET NULL,
  to_account_id uuid REFERENCES accounts(id) ON DELETE SET NULL,
  merchant_id uuid REFERENCES merchants(id) ON DELETE SET NULL,
  frequency text NOT NULL CHECK (frequency IN ('daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly')),
  interval integer DEFAULT 1 CHECK (interval > 0),
  day_of_week integer CHECK (day_of_week >= 0 AND day_of_week <= 6),
  day_of_month integer CHECK (day_of_month >= 1 AND day_of_month <= 31),
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date CHECK (end_date IS NULL OR end_date >= start_date),
  next_occurrence date NOT NULL,
  last_generated date,
  is_active boolean DEFAULT true,
  auto_generate boolean DEFAULT true,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE recurring_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own recurring transactions"
  ON recurring_transactions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own recurring transactions"
  ON recurring_transactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own recurring transactions"
  ON recurring_transactions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own recurring transactions"
  ON recurring_transactions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_recurring_transactions_user_id ON recurring_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_recurring_transactions_next_occurrence ON recurring_transactions(next_occurrence) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_recurring_transactions_active ON recurring_transactions(user_id, is_active);

-- Add recurring_transaction_id to transactions table to track generated transactions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'recurring_transaction_id'
  ) THEN
    ALTER TABLE transactions ADD COLUMN recurring_transaction_id uuid REFERENCES recurring_transactions(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_transactions_recurring_id ON transactions(recurring_transaction_id) WHERE recurring_transaction_id IS NOT NULL;

-- Function to calculate next occurrence date
CREATE OR REPLACE FUNCTION calculate_next_occurrence(
  p_current_date date,
  p_frequency text,
  p_interval integer,
  p_day_of_week integer,
  p_day_of_month integer
)
RETURNS date AS $$
DECLARE
  v_next_date date;
BEGIN
  CASE p_frequency
    WHEN 'daily' THEN
      v_next_date := p_current_date + (p_interval || ' days')::interval;

    WHEN 'weekly' THEN
      v_next_date := p_current_date + (p_interval || ' weeks')::interval;
      IF p_day_of_week IS NOT NULL THEN
        v_next_date := v_next_date + ((p_day_of_week - EXTRACT(DOW FROM v_next_date)::integer + 7) % 7 || ' days')::interval;
      END IF;

    WHEN 'biweekly' THEN
      v_next_date := p_current_date + (2 * p_interval || ' weeks')::interval;

    WHEN 'monthly' THEN
      v_next_date := p_current_date + (p_interval || ' months')::interval;
      IF p_day_of_month IS NOT NULL THEN
        v_next_date := date_trunc('month', v_next_date)::date + (LEAST(p_day_of_month, EXTRACT(DAY FROM (date_trunc('month', v_next_date) + interval '1 month' - interval '1 day'))::integer) - 1 || ' days')::interval;
      END IF;

    WHEN 'quarterly' THEN
      v_next_date := p_current_date + (3 * p_interval || ' months')::interval;
      IF p_day_of_month IS NOT NULL THEN
        v_next_date := date_trunc('month', v_next_date)::date + (LEAST(p_day_of_month, EXTRACT(DAY FROM (date_trunc('month', v_next_date) + interval '1 month' - interval '1 day'))::integer) - 1 || ' days')::interval;
      END IF;

    WHEN 'yearly' THEN
      v_next_date := p_current_date + (p_interval || ' years')::interval;

    ELSE
      v_next_date := p_current_date + (1 || ' days')::interval;
  END CASE;

  RETURN v_next_date;
END;
$$ LANGUAGE plpgsql;

-- Function to generate a single transaction from a recurring rule
CREATE OR REPLACE FUNCTION generate_recurring_transaction(
  p_recurring_id uuid,
  p_transaction_date date DEFAULT CURRENT_DATE
)
RETURNS uuid AS $$
DECLARE
  v_recurring record;
  v_transaction_id uuid;
BEGIN
  SELECT * INTO v_recurring
  FROM recurring_transactions
  WHERE id = p_recurring_id AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Recurring transaction not found or inactive';
  END IF;

  IF v_recurring.end_date IS NOT NULL AND p_transaction_date > v_recurring.end_date THEN
    UPDATE recurring_transactions
    SET is_active = false, updated_at = now()
    WHERE id = p_recurring_id;

    RETURN NULL;
  END IF;

  IF v_recurring.type = 'transfer' THEN
    SELECT * INTO v_transaction_id FROM create_transfer(
      p_user_id := v_recurring.user_id,
      p_from_account_id := v_recurring.account_id,
      p_to_account_id := v_recurring.to_account_id,
      p_amount := ABS(v_recurring.amount),
      p_date := p_transaction_date,
      p_description := v_recurring.description,
      p_notes := v_recurring.notes
    );

    UPDATE transactions
    SET recurring_transaction_id = p_recurring_id
    WHERE id = v_transaction_id;

  ELSE
    INSERT INTO transactions (
      user_id,
      amount,
      category,
      category_id,
      description,
      date,
      type,
      account_id,
      merchant_id,
      notes,
      recurring_transaction_id
    ) VALUES (
      v_recurring.user_id,
      v_recurring.amount,
      v_recurring.category,
      v_recurring.category_id,
      v_recurring.description,
      p_transaction_date,
      v_recurring.type,
      v_recurring.account_id,
      v_recurring.merchant_id,
      v_recurring.notes,
      p_recurring_id
    )
    RETURNING id INTO v_transaction_id;
  END IF;

  UPDATE recurring_transactions
  SET
    last_generated = p_transaction_date,
    next_occurrence = calculate_next_occurrence(
      p_transaction_date,
      frequency,
      interval,
      day_of_week,
      day_of_month
    ),
    updated_at = now()
  WHERE id = p_recurring_id;

  RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql;

-- Function to generate all due recurring transactions
CREATE OR REPLACE FUNCTION generate_due_recurring_transactions(
  p_up_to_date date DEFAULT CURRENT_DATE
)
RETURNS TABLE(
  recurring_id uuid,
  transaction_id uuid,
  transaction_date date
) AS $$
DECLARE
  v_recurring record;
  v_transaction_id uuid;
  v_current_date date;
BEGIN
  FOR v_recurring IN
    SELECT *
    FROM recurring_transactions
    WHERE is_active = true
      AND auto_generate = true
      AND next_occurrence <= p_up_to_date
      AND (end_date IS NULL OR next_occurrence <= end_date)
    ORDER BY next_occurrence
  LOOP
    v_current_date := v_recurring.next_occurrence;

    WHILE v_current_date <= p_up_to_date AND (v_recurring.end_date IS NULL OR v_current_date <= v_recurring.end_date) LOOP
      BEGIN
        v_transaction_id := generate_recurring_transaction(v_recurring.id, v_current_date);

        IF v_transaction_id IS NOT NULL THEN
          recurring_id := v_recurring.id;
          transaction_id := v_transaction_id;
          transaction_date := v_current_date;
          RETURN NEXT;
        END IF;

        v_current_date := calculate_next_occurrence(
          v_current_date,
          v_recurring.frequency,
          v_recurring.interval,
          v_recurring.day_of_week,
          v_recurring.day_of_month
        );

      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Error generating recurring transaction %: %', v_recurring.id, SQLERRM;
      END;
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_recurring_transactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_recurring_transactions_updated_at_trigger ON recurring_transactions;
CREATE TRIGGER update_recurring_transactions_updated_at_trigger
  BEFORE UPDATE ON recurring_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_recurring_transactions_updated_at();
