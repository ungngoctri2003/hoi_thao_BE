-- Add 'pending' status to REGISTRATIONS table
-- This migration adds the ability for registrations to be in a pending state
-- requiring admin/staff approval before becoming 'registered'

-- First, find and drop the existing check constraint
-- Since we don't know the exact name, we need to drop it dynamically
DECLARE
  v_constraint_name VARCHAR2(128);
BEGIN
  -- Find the constraint name for STATUS column
  SELECT constraint_name INTO v_constraint_name
  FROM user_constraints
  WHERE table_name = 'REGISTRATIONS'
  AND constraint_type = 'C'
  AND search_condition_vc LIKE '%STATUS%'
  AND constraint_name NOT LIKE 'SYS_C%'
  FETCH FIRST 1 ROW ONLY;
  
  -- Drop the constraint
  EXECUTE IMMEDIATE 'ALTER TABLE REGISTRATIONS DROP CONSTRAINT ' || v_constraint_name;
EXCEPTION
  WHEN NO_DATA_FOUND THEN
    -- Try to find system-generated constraint
    BEGIN
      SELECT constraint_name INTO v_constraint_name
      FROM user_constraints
      WHERE table_name = 'REGISTRATIONS'
      AND constraint_type = 'C'
      AND search_condition_vc LIKE '%STATUS%'
      FETCH FIRST 1 ROW ONLY;
      
      EXECUTE IMMEDIATE 'ALTER TABLE REGISTRATIONS DROP CONSTRAINT ' || v_constraint_name;
    EXCEPTION
      WHEN NO_DATA_FOUND THEN
        NULL; -- No constraint found, continue
    END;
END;
/

-- Add new constraint with 'pending' status
ALTER TABLE REGISTRATIONS ADD CONSTRAINT CHK_REGISTRATION_STATUS 
  CHECK (STATUS IN ('pending', 'registered', 'checked-in', 'checked-out', 'cancelled', 'no-show'));

-- Update the default status to 'pending' for new registrations
ALTER TABLE REGISTRATIONS MODIFY STATUS VARCHAR2(20) DEFAULT 'pending';

-- Add a column to track who approved the registration (optional)
ALTER TABLE REGISTRATIONS ADD APPROVED_BY NUMBER NULL;
ALTER TABLE REGISTRATIONS ADD APPROVED_AT TIMESTAMP NULL;
ALTER TABLE REGISTRATIONS ADD CONSTRAINT FK_REGISTRATION_APPROVED_BY 
  FOREIGN KEY (APPROVED_BY) REFERENCES APP_USERS(ID) ON DELETE SET NULL;

-- Create index for faster status queries
CREATE INDEX IDX_REGISTRATIONS_STATUS ON REGISTRATIONS(STATUS);

-- Add comments
COMMENT ON COLUMN REGISTRATIONS.STATUS IS 'Registration status: pending (waiting approval), registered (approved), checked-in, checked-out, cancelled, no-show';
COMMENT ON COLUMN REGISTRATIONS.APPROVED_BY IS 'User ID of admin/staff who approved the registration';
COMMENT ON COLUMN REGISTRATIONS.APPROVED_AT IS 'Timestamp when the registration was approved';

