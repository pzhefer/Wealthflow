/*
  # Add Notes Field to Investment Holdings

  1. Changes
    - Add notes field to investment_holdings table
    - This field was being used in the app but didn't exist in the schema
*/

-- Add notes column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'investment_holdings' AND column_name = 'notes'
  ) THEN
    ALTER TABLE investment_holdings 
    ADD COLUMN notes text DEFAULT NULL;
  END IF;
END $$;