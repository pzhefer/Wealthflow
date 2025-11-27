/*
  # Create Documents Table and Storage

  1. New Tables
    - `documents`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `name` (text, document name)
      - `description` (text, optional description)
      - `category` (text, document category)
      - `file_path` (text, path in storage bucket)
      - `file_size` (bigint, file size in bytes)
      - `mime_type` (text, file MIME type)
      - `tags` (text[], array of tags for search)
      - `transaction_id` (uuid, optional link to transaction)
      - `account_id` (uuid, optional link to account)
      - `goal_id` (uuid, optional link to goal)
      - `merchant_id` (uuid, optional link to merchant)
      - `ocr_text` (text, extracted text from OCR)
      - `ocr_data` (jsonb, structured OCR data)
      - `is_receipt` (boolean, true if document is a receipt)
      - `receipt_amount` (numeric, extracted amount from receipt)
      - `receipt_date` (date, extracted date from receipt)
      - `receipt_merchant` (text, extracted merchant name)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `documents` table
    - Add policies for authenticated users to manage their own documents

  3. Indexes
    - Index on user_id for fast queries
    - GIN index on tags for full-text search
    - Index on category for filtering
    - Index on transaction_id, account_id, goal_id for associations
*/

-- Create documents table
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text DEFAULT '',
  category text NOT NULL,
  file_path text NOT NULL,
  file_size bigint NOT NULL,
  mime_type text NOT NULL,
  tags text[] DEFAULT '{}',
  transaction_id uuid REFERENCES transactions(id) ON DELETE SET NULL,
  account_id uuid REFERENCES accounts(id) ON DELETE SET NULL,
  goal_id uuid REFERENCES goals(id) ON DELETE SET NULL,
  merchant_id uuid REFERENCES merchants(id) ON DELETE SET NULL,
  ocr_text text DEFAULT '',
  ocr_data jsonb DEFAULT '{}'::jsonb,
  is_receipt boolean DEFAULT false,
  receipt_amount numeric,
  receipt_date date,
  receipt_merchant text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own documents"
  ON documents FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own documents"
  ON documents FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own documents"
  ON documents FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own documents"
  ON documents FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(category);
CREATE INDEX IF NOT EXISTS idx_documents_transaction_id ON documents(transaction_id);
CREATE INDEX IF NOT EXISTS idx_documents_account_id ON documents(account_id);
CREATE INDEX IF NOT EXISTS idx_documents_goal_id ON documents(goal_id);
CREATE INDEX IF NOT EXISTS idx_documents_merchant_id ON documents(merchant_id);
CREATE INDEX IF NOT EXISTS idx_documents_is_receipt ON documents(is_receipt);
CREATE INDEX IF NOT EXISTS idx_documents_tags ON documents USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at DESC);

-- Full-text search on OCR text (optional, for advanced search)
CREATE INDEX IF NOT EXISTS idx_documents_ocr_text ON documents USING GIN(to_tsvector('english', ocr_text));

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION update_documents_updated_at();
