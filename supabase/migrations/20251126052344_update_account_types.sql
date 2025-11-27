/*
  # Update Account Types

  1. Changes
    - Add missing account types: crypto, real_estate
    - Update CHECK constraint on accounts.type column
*/

-- Drop old constraint and add new one with all types
ALTER TABLE accounts DROP CONSTRAINT IF EXISTS accounts_type_check;

ALTER TABLE accounts ADD CONSTRAINT accounts_type_check 
  CHECK (type IN ('checking', 'savings', 'credit_card', 'investment', 'loan', 'mortgage', 'crypto', 'real_estate', 'other'));