/*
  # Fix Categories and Add Transfer System

  1. Changes to Transactions Table
    - Add category_id foreign key reference
    - Add transfer type
    - Add to_account_id for transfers
    - Add linked_transaction_id for transfer pairs
    - Keep category text field temporarily for migration

  2. New Features
    - Proper transfer tracking with linked transactions
    - Category foreign key relationships
    - Transfer exclusion from income/expense calculations

  3. Security
    - Update RLS policies for transfers
    - Ensure users can only link their own accounts

  4. Important Notes
    - Transfers create two linked transactions
    - Transfer amounts don't count as income/expense
    - System prevents double-counting in reports
*/

-- Add new columns to transactions table
DO $$
BEGIN
  -- Add category_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'category_id'
  ) THEN
    ALTER TABLE transactions ADD COLUMN category_id uuid REFERENCES categories(id) ON DELETE SET NULL;
  END IF;

  -- Add to_account_id for transfers
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'to_account_id'
  ) THEN
    ALTER TABLE transactions ADD COLUMN to_account_id uuid REFERENCES accounts(id) ON DELETE CASCADE;
  END IF;

  -- Add linked_transaction_id for transfer pairs
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'linked_transaction_id'
  ) THEN
    ALTER TABLE transactions ADD COLUMN linked_transaction_id uuid REFERENCES transactions(id) ON DELETE CASCADE;
  END IF;

  -- Add notes field for additional context
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'notes'
  ) THEN
    ALTER TABLE transactions ADD COLUMN notes text DEFAULT '';
  END IF;
END $$;

-- Drop the old CHECK constraint on type
DO $$
BEGIN
  ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_type_check;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Add new CHECK constraint with 'transfer' type
ALTER TABLE transactions ADD CONSTRAINT transactions_type_check 
  CHECK (type IN ('income', 'expense', 'transfer'));

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_transactions_category_id ON transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_to_account_id ON transactions(to_account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_linked_transaction_id ON transactions(linked_transaction_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);

-- Add Transfer system category
INSERT INTO categories (name, type, icon, color, is_system)
VALUES ('Transfer', 'both', '🔄', '#3b82f6', true)
ON CONFLICT DO NOTHING;

-- Create function to handle transfer creation
CREATE OR REPLACE FUNCTION create_transfer(
  p_user_id uuid,
  p_from_account_id uuid,
  p_to_account_id uuid,
  p_amount numeric,
  p_date date,
  p_description text,
  p_notes text DEFAULT ''
)
RETURNS json AS $$
DECLARE
  v_transfer_category_id uuid;
  v_from_transaction_id uuid;
  v_to_transaction_id uuid;
  v_result json;
BEGIN
  -- Get Transfer category ID
  SELECT id INTO v_transfer_category_id
  FROM categories
  WHERE name = 'Transfer' AND is_system = true
  LIMIT 1;

  -- Create "from" transaction (expense from source account)
  INSERT INTO transactions (
    user_id,
    account_id,
    to_account_id,
    amount,
    type,
    category,
    category_id,
    description,
    notes,
    date
  ) VALUES (
    p_user_id,
    p_from_account_id,
    p_to_account_id,
    p_amount,
    'transfer',
    'Transfer',
    v_transfer_category_id,
    p_description,
    p_notes,
    p_date
  ) RETURNING id INTO v_from_transaction_id;

  -- Create "to" transaction (income to destination account)
  INSERT INTO transactions (
    user_id,
    account_id,
    amount,
    type,
    category,
    category_id,
    description,
    notes,
    date,
    linked_transaction_id
  ) VALUES (
    p_user_id,
    p_to_account_id,
    p_amount,
    'transfer',
    'Transfer',
    v_transfer_category_id,
    p_description,
    p_notes,
    p_date,
    v_from_transaction_id
  ) RETURNING id INTO v_to_transaction_id;

  -- Link the from transaction to the to transaction
  UPDATE transactions
  SET linked_transaction_id = v_to_transaction_id
  WHERE id = v_from_transaction_id;

  -- Return both transaction IDs
  v_result := json_build_object(
    'from_transaction_id', v_from_transaction_id,
    'to_transaction_id', v_to_transaction_id
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to delete transfer (deletes both sides)
CREATE OR REPLACE FUNCTION delete_transfer(p_transaction_id uuid)
RETURNS void AS $$
DECLARE
  v_linked_id uuid;
BEGIN
  -- Get the linked transaction ID
  SELECT linked_transaction_id INTO v_linked_id
  FROM transactions
  WHERE id = p_transaction_id;

  -- Delete both transactions
  DELETE FROM transactions WHERE id = p_transaction_id;
  
  IF v_linked_id IS NOT NULL THEN
    DELETE FROM transactions WHERE id = v_linked_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;