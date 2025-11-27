/*
  # Enhance Goals System with Three-Level Architecture

  ## Overview
  Transforms goals into a comprehensive planning system with:
  - Goal Items (sub-categories/components)
  - Quotes (price comparisons)
  - Transaction linking (actual cost tracking)
  - Account integration (real money allocation)

  ## Three-Level Structure
  1. **Goals** (Main level) - "Hawaii Vacation" - $1,000 budget
  2. **Goal Items** (Components) - "Flights" $400, "Hotel" $400, "Activities" $200
  3. **Goal Item Quotes** (Price options) - Multiple quotes per item

  ## Use Case Example
  Goal: Hawaii Vacation ($1,000)
  ├─ Flights ($400 budget)
  │  ├─ Quote: Airline A $380 ✓ selected
  │  ├─ Quote: Airline B $420
  │  └─ Transaction: $380 actual spent
  ├─ Accommodation ($400 budget)
  │  ├─ Quote: Hotel $450
  │  ├─ Quote: Airbnb $350 ✓ selected
  │  └─ Transaction: $350 actual spent
  └─ Activities ($200 budget)
     └─ Estimated: $200

  ## Database Changes
  1. Enhance goals table - Add linked_account_id
  2. Create goal_items table - Sub-categories
  3. Create goal_item_quotes table - Price quotes
  4. Enhance transactions table - Add goal_item_id

  ## Security
  - All tables have RLS enabled
  - Users can only access their own goals and related data
*/

-- Add linked_account_id to goals
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'goals' AND column_name = 'linked_account_id'
  ) THEN
    ALTER TABLE goals ADD COLUMN linked_account_id uuid REFERENCES accounts(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add notes field to goals
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'goals' AND column_name = 'notes'
  ) THEN
    ALTER TABLE goals ADD COLUMN notes text DEFAULT '';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_goals_linked_account_id ON goals(linked_account_id);

-- Create goal_items table
CREATE TABLE IF NOT EXISTS goal_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id uuid REFERENCES goals(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text DEFAULT '',
  budget_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'quoted', 'booked', 'completed', 'cancelled')),
  sort_order integer DEFAULT 0,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE goal_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own goal items"
  ON goal_items FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own goal items"
  ON goal_items FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own goal items"
  ON goal_items FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own goal items"
  ON goal_items FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_goal_items_goal_id ON goal_items(goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_items_user_id ON goal_items(user_id);
CREATE INDEX IF NOT EXISTS idx_goal_items_status ON goal_items(status);
CREATE INDEX IF NOT EXISTS idx_goal_items_sort_order ON goal_items(sort_order);

-- Create goal_item_quotes table
CREATE TABLE IF NOT EXISTS goal_item_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_item_id uuid REFERENCES goal_items(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  vendor_name text NOT NULL,
  amount numeric NOT NULL,
  notes text DEFAULT '',
  is_selected boolean DEFAULT false,
  quote_date date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE goal_item_quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own goal item quotes"
  ON goal_item_quotes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own goal item quotes"
  ON goal_item_quotes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own goal item quotes"
  ON goal_item_quotes FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own goal item quotes"
  ON goal_item_quotes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_goal_item_quotes_goal_item_id ON goal_item_quotes(goal_item_id);
CREATE INDEX IF NOT EXISTS idx_goal_item_quotes_user_id ON goal_item_quotes(user_id);
CREATE INDEX IF NOT EXISTS idx_goal_item_quotes_is_selected ON goal_item_quotes(is_selected);

-- Add goal_item_id to transactions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'goal_item_id'
  ) THEN
    ALTER TABLE transactions ADD COLUMN goal_item_id uuid REFERENCES goal_items(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_transactions_goal_item_id ON transactions(goal_item_id);

-- Trigger function for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_goal_items_updated_at ON goal_items;
CREATE TRIGGER update_goal_items_updated_at
  BEFORE UPDATE ON goal_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_goal_item_quotes_updated_at ON goal_item_quotes;
CREATE TRIGGER update_goal_item_quotes_updated_at
  BEFORE UPDATE ON goal_item_quotes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
