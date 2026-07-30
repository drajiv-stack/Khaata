-- Balance constraint trigger: ensures SUM(amount) = 0 for all lines in a transaction
CREATE OR REPLACE FUNCTION assert_txn_balanced() RETURNS trigger AS $$
DECLARE s numeric(14,2);
BEGIN
  SELECT COALESCE(SUM(amount),0) INTO s
    FROM transaction_lines WHERE transaction_id = NEW.transaction_id;
  IF s <> 0 THEN
    RAISE EXCEPTION 'Transaction % is unbalanced by %', NEW.transaction_id, s;
  END IF;
  RETURN NULL;
END $$ LANGUAGE plpgsql;

-- This trigger is DEFERRABLE so it fires at the end of the transaction commit, 
-- allowing multiple lines to be inserted in an unbalanced state during the transaction.
CREATE CONSTRAINT TRIGGER trg_txn_balanced
  AFTER INSERT OR UPDATE ON transaction_lines
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION assert_txn_balanced();


-- Immutability trigger: prevents editing or deleting lines of a posted transaction
CREATE OR REPLACE FUNCTION prevent_posted_mutation() RETURNS trigger AS $$
DECLARE txn_status text;
BEGIN
  -- Get the status of the parent transaction
  -- For UPDATE/DELETE, we use OLD.transaction_id
  SELECT status INTO txn_status
    FROM transactions WHERE id = OLD.transaction_id;
    
  IF txn_status = 'POSTED' THEN
    RAISE EXCEPTION 'Cannot modify or delete lines of a POSTED transaction. Use a reversal entry instead.';
  END IF;
  
  -- If we're updating and changing the transaction_id (unlikely but possible), check the NEW one too
  IF TG_OP = 'UPDATE' AND NEW.transaction_id <> OLD.transaction_id THEN
    SELECT status INTO txn_status
      FROM transactions WHERE id = NEW.transaction_id;
    IF txn_status = 'POSTED' THEN
      RAISE EXCEPTION 'Cannot move a line to a POSTED transaction.';
    END IF;
  END IF;

  RETURN NEW;
END $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_posted_mutation
  BEFORE UPDATE OR DELETE ON transaction_lines
  FOR EACH ROW EXECUTE FUNCTION prevent_posted_mutation();