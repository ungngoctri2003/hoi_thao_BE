-- Quick fix for registration status constraint
-- This script will find and drop the old constraint, then add the new one

-- Step 1: Find the constraint name
SET SERVEROUTPUT ON;

DECLARE
  v_constraint_name VARCHAR2(128);
  v_sql VARCHAR2(500);
BEGIN
  -- Find the STATUS constraint
  SELECT constraint_name INTO v_constraint_name
  FROM user_constraints
  WHERE table_name = 'REGISTRATIONS'
  AND constraint_type = 'C'
  AND search_condition LIKE '%STATUS%'
  FETCH FIRST 1 ROW ONLY;
  
  DBMS_OUTPUT.PUT_LINE('Found constraint: ' || v_constraint_name);
  
  -- Drop it
  v_sql := 'ALTER TABLE REGISTRATIONS DROP CONSTRAINT ' || v_constraint_name;
  DBMS_OUTPUT.PUT_LINE('Executing: ' || v_sql);
  EXECUTE IMMEDIATE v_sql;
  DBMS_OUTPUT.PUT_LINE('✓ Dropped old constraint');
  
  -- Add new constraint
  v_sql := 'ALTER TABLE REGISTRATIONS ADD CONSTRAINT CHK_REGISTRATION_STATUS CHECK (STATUS IN (''pending'', ''registered'', ''checked-in'', ''checked-out'', ''cancelled'', ''no-show''))';
  DBMS_OUTPUT.PUT_LINE('Executing: ' || v_sql);
  EXECUTE IMMEDIATE v_sql;
  DBMS_OUTPUT.PUT_LINE('✓ Added new constraint with pending status');
  
  DBMS_OUTPUT.PUT_LINE('✓ Migration completed successfully!');
EXCEPTION
  WHEN NO_DATA_FOUND THEN
    DBMS_OUTPUT.PUT_LINE('✗ No constraint found - table might not exist or constraint already modified');
  WHEN OTHERS THEN
    DBMS_OUTPUT.PUT_LINE('✗ Error: ' || SQLERRM);
    RAISE;
END;
/

-- Optional: Update default value
ALTER TABLE REGISTRATIONS MODIFY STATUS VARCHAR2(20) DEFAULT 'pending';

-- Optional: Add approval tracking columns if they don't exist
DECLARE
  v_count NUMBER;
BEGIN
  -- Check if APPROVED_BY column exists
  SELECT COUNT(*) INTO v_count
  FROM user_tab_columns
  WHERE table_name = 'REGISTRATIONS' AND column_name = 'APPROVED_BY';
  
  IF v_count = 0 THEN
    EXECUTE IMMEDIATE 'ALTER TABLE REGISTRATIONS ADD APPROVED_BY NUMBER NULL';
    DBMS_OUTPUT.PUT_LINE('✓ Added APPROVED_BY column');
  ELSE
    DBMS_OUTPUT.PUT_LINE('ℹ APPROVED_BY column already exists');
  END IF;
  
  -- Check if APPROVED_AT column exists
  SELECT COUNT(*) INTO v_count
  FROM user_tab_columns
  WHERE table_name = 'REGISTRATIONS' AND column_name = 'APPROVED_AT';
  
  IF v_count = 0 THEN
    EXECUTE IMMEDIATE 'ALTER TABLE REGISTRATIONS ADD APPROVED_AT TIMESTAMP NULL';
    DBMS_OUTPUT.PUT_LINE('✓ Added APPROVED_AT column');
  ELSE
    DBMS_OUTPUT.PUT_LINE('ℹ APPROVED_AT column already exists');
  END IF;
END;
/

-- Show final constraint
SELECT constraint_name, constraint_type, search_condition
FROM user_constraints
WHERE table_name = 'REGISTRATIONS' AND constraint_name = 'CHK_REGISTRATION_STATUS';

COMMIT;

