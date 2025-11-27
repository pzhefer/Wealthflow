/*
  # Add Update Transfer Function

  1. New Function
    - update_transfer: Updates both sides of a transfer transaction
    
  2. Parameters
    - p_transaction_id: The ID of one side of the transfer
    - p_from_account_id: Updated source account
    - p_to_account_id: Updated destination account
    - p_amount: Updated amount
    - p_date: Updated date
    - p_description: Updated description
    - p_notes: Updated notes
    
  3. Behavior
    - Finds the linked transaction
    - Updates both transactions to maintain consistency
    - Returns success status
*/

CREATE OR REPLACE FUNCTION update_transfer(
  p_transaction_id uuid,
  p_from_account_id uuid,
  p_to_account_id uuid,
  p_amount numeric,
  p_date date,
  p_description text,
  p_notes text DEFAULT ''
)
RETURNS json AS $$
DECLARE
  v_linked_id uuid;
  v_from_transaction_id uuid;
  v_to_transaction_id uuid;
  v_transfer_category_id uuid;
  v_is_from_transaction boolean;
BEGIN
  -- Get Transfer category ID
  SELECT id INTO v_transfer_category_id
  FROM categories
  WHERE name = 'Transfer' AND is_system = true
  LIMIT 1;

  -- Get the linked transaction ID
  SELECT linked_transaction_id INTO v_linked_id
  FROM transactions
  WHERE id = p_transaction_id;

  -- Determine which transaction is which
  -- The transaction with to_account_id is the "from" transaction
  SELECT (to_account_id IS NOT NULL) INTO v_is_from_transaction
  FROM transactions
  WHERE id = p_transaction_id;

  IF v_is_from_transaction THEN
    v_from_transaction_id := p_transaction_id;
    v_to_transaction_id := v_linked_id;
  ELSE
    v_from_transaction_id := v_linked_id;
    v_to_transaction_id := p_transaction_id;
  END IF;

  -- Update the "from" transaction
  UPDATE transactions SET
    account_id = p_from_account_id,
    to_account_id = p_to_account_id,
    amount = p_amount,
    date = p_date,
    description = p_description,
    notes = p_notes,
    updated_at = now()
  WHERE id = v_from_transaction_id;

  -- Update the "to" transaction
  UPDATE transactions SET
    account_id = p_to_account_id,
    amount = p_amount,
    date = p_date,
    description = p_description,
    notes = p_notes,
    updated_at = now()
  WHERE id = v_to_transaction_id;

  RETURN json_build_object(
    'success', true,
    'from_transaction_id', v_from_transaction_id,
    'to_transaction_id', v_to_transaction_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;