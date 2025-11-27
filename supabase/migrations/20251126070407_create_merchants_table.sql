/*
  # Create Merchants Table

  1. New Tables
    - merchants: Store merchant/vendor information
      - id (uuid, primary key)
      - user_id (uuid, references auth.users)
      - name (text) - Merchant name
      - category (text) - Default category for transactions
      - notes (text) - Additional notes
      - is_favorite (boolean) - Quick access flag
      - created_at (timestamptz)

  2. Changes to Transactions Table
    - Add merchant_id foreign key reference
    - Add merchant_name text field for flexibility

  3. Security
    - Enable RLS on merchants table
    - Add policies for CRUD operations
    - Users can only access their own merchants

  4. Indexes
    - Index on user_id for faster queries
    - Index on name for search functionality
*/

-- Create merchants table
CREATE TABLE IF NOT EXISTS merchants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  category text DEFAULT '',
  notes text DEFAULT '',
  is_favorite boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE merchants ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own merchants"
  ON merchants FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own merchants"
  ON merchants FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own merchants"
  ON merchants FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own merchants"
  ON merchants FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Add merchant fields to transactions table
DO $$
BEGIN
  -- Add merchant_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'merchant_id'
  ) THEN
    ALTER TABLE transactions ADD COLUMN merchant_id uuid REFERENCES merchants(id) ON DELETE SET NULL;
  END IF;

  -- Add merchant_name column for quick reference
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'merchant_name'
  ) THEN
    ALTER TABLE transactions ADD COLUMN merchant_name text DEFAULT '';
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_merchants_user_id ON merchants(user_id);
CREATE INDEX IF NOT EXISTS idx_merchants_name ON merchants(name);
CREATE INDEX IF NOT EXISTS idx_merchants_favorite ON merchants(user_id, is_favorite) WHERE is_favorite = true;
CREATE INDEX IF NOT EXISTS idx_transactions_merchant_id ON transactions(merchant_id);
CREATE INDEX IF NOT EXISTS idx_transactions_merchant_name ON transactions(merchant_name);

-- Insert some common merchants as examples (optional - users will add their own)
-- These are just suggestions and won't be created automatically