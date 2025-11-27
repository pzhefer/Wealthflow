/*
  # Add Categories Table

  1. New Tables
    - categories: Predefined and custom transaction categories

  2. Changes
    - Add categories table with predefined categories
    - Add user_preferences table for app settings
    - Add default categories for all users

  3. Security
    - Enable RLS on categories table
    - Users can view all categories and create custom ones
*/

-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('income', 'expense', 'both')),
  icon text DEFAULT '📝',
  color text DEFAULT '#64748b',
  is_system boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all categories"
  ON categories FOR SELECT
  TO authenticated
  USING (is_system = true OR auth.uid() = user_id);

CREATE POLICY "Users can insert own categories"
  ON categories FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id AND is_system = false);

CREATE POLICY "Users can update own categories"
  ON categories FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND is_system = false)
  WITH CHECK (auth.uid() = user_id AND is_system = false);

CREATE POLICY "Users can delete own categories"
  ON categories FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id AND is_system = false);

-- Insert default system categories
INSERT INTO categories (name, type, icon, color, is_system) VALUES
  ('Salary', 'income', '💰', '#10b981', true),
  ('Freelance', 'income', '💼', '#10b981', true),
  ('Investment Income', 'income', '📈', '#10b981', true),
  ('Business', 'income', '🏢', '#10b981', true),
  ('Other Income', 'income', '💵', '#10b981', true),
  
  ('Groceries', 'expense', '🛒', '#ef4444', true),
  ('Dining', 'expense', '🍽️', '#ef4444', true),
  ('Transportation', 'expense', '🚗', '#ef4444', true),
  ('Housing', 'expense', '🏠', '#ef4444', true),
  ('Utilities', 'expense', '⚡', '#ef4444', true),
  ('Healthcare', 'expense', '🏥', '#ef4444', true),
  ('Entertainment', 'expense', '🎬', '#ef4444', true),
  ('Shopping', 'expense', '🛍️', '#ef4444', true),
  ('Travel', 'expense', '✈️', '#ef4444', true),
  ('Education', 'expense', '📚', '#ef4444', true),
  ('Insurance', 'expense', '🛡️', '#ef4444', true),
  ('Subscriptions', 'expense', '📱', '#ef4444', true),
  ('Gifts', 'expense', '🎁', '#ef4444', true),
  ('Personal Care', 'expense', '💇', '#ef4444', true),
  ('Pet Care', 'expense', '🐾', '#ef4444', true),
  ('Other Expense', 'expense', '💸', '#ef4444', true),
  
  ('Rent', 'expense', '🏘️', '#dc2626', true),
  ('Mortgage', 'expense', '🏡', '#dc2626', true);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_categories_type ON categories(type);
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);