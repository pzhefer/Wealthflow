/*
  # Create Trading Journal System

  1. New Tables
    - trades: Individual trade records with entry/exit details
    - trade_notes: Journal notes and analysis for each trade

  2. Features
    - Track buy/sell trades
    - Record entry and exit prices
    - Calculate profit/loss and ROI
    - Add trading notes and strategies
    - Tag trades with categories (swing, day, long-term)
    - Record emotions and lessons learned

  3. Security
    - Enable RLS on all tables
    - Users can only access their own trades

  4. Important Notes
    - Supports stocks, crypto, options, and other instruments
    - Tracks commission fees
    - Records trade strategy and outcome
*/

-- Create trades table
CREATE TABLE IF NOT EXISTS trades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  portfolio_id uuid REFERENCES investment_portfolios(id) ON DELETE SET NULL,
  symbol text NOT NULL,
  name text NOT NULL,
  trade_type text NOT NULL CHECK (trade_type IN ('buy', 'sell', 'short', 'cover')),
  instrument_type text DEFAULT 'stock' CHECK (instrument_type IN ('stock', 'crypto', 'option', 'etf', 'forex', 'other')),
  quantity numeric NOT NULL,
  entry_price numeric NOT NULL,
  exit_price numeric DEFAULT NULL,
  entry_date timestamptz NOT NULL,
  exit_date timestamptz,
  commission numeric DEFAULT 0,
  profit_loss numeric,
  roi_percentage numeric,
  strategy text DEFAULT '',
  status text DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE trades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own trades"
  ON trades FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own trades"
  ON trades FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own trades"
  ON trades FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own trades"
  ON trades FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create trade_notes table
CREATE TABLE IF NOT EXISTS trade_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id uuid REFERENCES trades(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  note_type text DEFAULT 'general' CHECK (note_type IN ('general', 'strategy', 'emotion', 'lesson', 'analysis')),
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE trade_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own trade notes"
  ON trade_notes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own trade notes"
  ON trade_notes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own trade notes"
  ON trade_notes FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own trade notes"
  ON trade_notes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_trades_user_id ON trades(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_portfolio_id ON trades(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_trades_symbol ON trades(symbol);
CREATE INDEX IF NOT EXISTS idx_trades_status ON trades(status);
CREATE INDEX IF NOT EXISTS idx_trades_entry_date ON trades(entry_date);
CREATE INDEX IF NOT EXISTS idx_trade_notes_trade_id ON trade_notes(trade_id);
CREATE INDEX IF NOT EXISTS idx_trade_notes_user_id ON trade_notes(user_id);

-- Function to auto-calculate profit/loss when trade is closed
CREATE OR REPLACE FUNCTION calculate_trade_metrics()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.exit_price IS NOT NULL AND NEW.status = 'closed' THEN
    -- Calculate profit/loss
    IF NEW.trade_type IN ('buy', 'cover') THEN
      NEW.profit_loss := (NEW.exit_price - NEW.entry_price) * NEW.quantity - NEW.commission;
    ELSE
      NEW.profit_loss := (NEW.entry_price - NEW.exit_price) * NEW.quantity - NEW.commission;
    END IF;
    
    -- Calculate ROI percentage
    IF NEW.entry_price > 0 THEN
      NEW.roi_percentage := ((NEW.profit_loss / (NEW.entry_price * NEW.quantity)) * 100);
    END IF;
  END IF;
  
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic calculation
DROP TRIGGER IF EXISTS trigger_calculate_trade_metrics ON trades;
CREATE TRIGGER trigger_calculate_trade_metrics
  BEFORE INSERT OR UPDATE ON trades
  FOR EACH ROW
  EXECUTE FUNCTION calculate_trade_metrics();