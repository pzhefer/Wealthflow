/*
  # Create Transaction Splits Table

  1. New Tables
    - transaction_splits: Enable splitting transactions across multiple categories
      - id (uuid, primary key)
      - transaction_id (uuid, foreign key to transactions)
      - category_id (uuid, foreign key to categories)
      - amount (numeric) - Split amount
      - percentage (numeric, optional) - Percentage of total
      - notes (text) - Notes for this split
      - created_at (timestamptz)

  2. Changes to Transactions Table
    - Add is_split (boolean) - Flag to indicate if transaction has splits
    - Add parent_split_id (uuid) - For potential parent-child split relationships

  3. Security
    - Enable RLS on transaction_splits table
    - Add policies for CRUD operations
    - Users can only access splits for their own transactions

  4. Constraints
    - Split amounts must be positive
    - Percentage must be between 0 and 100
    - Transaction_id is required

  5. Indexes
    - Index on transaction_id for faster lookups
    - Index on category_id for reporting
*/

-- Create transaction_splits table
CREATE TABLE IF NOT EXISTS transaction_splits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid REFERENCES transactions(id) ON DELETE CASCADE NOT NULL,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  percentage numeric CHECK (percentage >= 0 AND percentage <= 100),
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE transaction_splits ENABLE ROW LEVEL SECURITY;

-- RLS Policies for transaction_splits
-- Users can view splits for their own transactions
CREATE POLICY "Users can view own transaction splits"
  ON transaction_splits FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM transactions
      WHERE transactions.id = transaction_splits.transaction_id
      AND transactions.user_id = auth.uid()
    )
  );

-- Users can insert splits for their own transactions
CREATE POLICY "Users can insert own transaction splits"
  ON transaction_splits FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM transactions
      WHERE transactions.id = transaction_splits.transaction_id
      AND transactions.user_id = auth.uid()
    )
  );

-- Users can update splits for their own transactions
CREATE POLICY "Users can update own transaction splits"
  ON transaction_splits FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM transactions
      WHERE transactions.id = transaction_splits.transaction_id
      AND transactions.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM transactions
      WHERE transactions.id = transaction_splits.transaction_id
      AND transactions.user_id = auth.uid()
    )
  );

-- Users can delete splits for their own transactions
CREATE POLICY "Users can delete own transaction splits"
  ON transaction_splits FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM transactions
      WHERE transactions.id = transaction_splits.transaction_id
      AND transactions.user_id = auth.uid()
    )
  );

-- Add is_split column to transactions table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'is_split'
  ) THEN
    ALTER TABLE transactions ADD COLUMN is_split boolean DEFAULT false;
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_transaction_splits_transaction_id ON transaction_splits(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transaction_splits_category_id ON transaction_splits(category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_is_split ON transactions(user_id, is_split) WHERE is_split = true;

-- Create function to validate split totals
CREATE OR REPLACE FUNCTION validate_split_totals()
RETURNS TRIGGER AS $$
DECLARE
  v_transaction_amount numeric;
  v_total_splits numeric;
BEGIN
  -- Get the transaction amount
  SELECT ABS(amount) INTO v_transaction_amount
  FROM transactions
  WHERE id = NEW.transaction_id;

  -- Calculate total of all splits for this transaction
  SELECT COALESCE(SUM(amount), 0) INTO v_total_splits
  FROM transaction_splits
  WHERE transaction_id = NEW.transaction_id;

  -- Check if total splits exceed transaction amount
  IF v_total_splits > v_transaction_amount THEN
    RAISE EXCEPTION 'Total split amounts (%) exceed transaction amount (%)', 
      v_total_splits, v_transaction_amount;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate split totals
DROP TRIGGER IF EXISTS validate_split_totals_trigger ON transaction_splits;
CREATE TRIGGER validate_split_totals_trigger
  BEFORE INSERT OR UPDATE ON transaction_splits
  FOR EACH ROW
  EXECUTE FUNCTION validate_split_totals();

-- Create function to auto-update is_split flag
CREATE OR REPLACE FUNCTION update_transaction_split_flag()
RETURNS TRIGGER AS $$
BEGIN
  -- When splits are added/updated, set is_split to true
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
    UPDATE transactions
    SET is_split = true
    WHERE id = NEW.transaction_id;
    RETURN NEW;
  END IF;

  -- When all splits are deleted, set is_split to false
  IF (TG_OP = 'DELETE') THEN
    UPDATE transactions
    SET is_split = (
      EXISTS (
        SELECT 1 FROM transaction_splits
        WHERE transaction_id = OLD.transaction_id
        AND id != OLD.id
      )
    )
    WHERE id = OLD.transaction_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update is_split flag
DROP TRIGGER IF EXISTS update_transaction_split_flag_trigger ON transaction_splits;
CREATE TRIGGER update_transaction_split_flag_trigger
  AFTER INSERT OR UPDATE OR DELETE ON transaction_splits
  FOR EACH ROW
  EXECUTE FUNCTION update_transaction_split_flag();