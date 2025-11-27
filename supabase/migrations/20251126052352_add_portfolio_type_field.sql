/*
  # Add Type Field to Investment Portfolios

  1. Changes
    - Add type field to investment_portfolios table
    - This field was being used in the app but didn't exist in the schema
*/

-- Add type column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'investment_portfolios' AND column_name = 'type'
  ) THEN
    ALTER TABLE investment_portfolios 
    ADD COLUMN type text DEFAULT 'stocks' CHECK (type IN ('stocks', 'crypto', 'other'));
  END IF;
END $$;