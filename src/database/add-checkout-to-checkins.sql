-- Add ACTION_TYPE column to CHECKINS table to support both check-in and check-out
-- This allows tracking both entry and exit of attendees

-- Add ACTION_TYPE column
ALTER TABLE CHECKINS ADD ACTION_TYPE VARCHAR2(20) DEFAULT 'checkin' 
    CHECK (ACTION_TYPE IN ('checkin', 'checkout'));

-- Add comment for documentation
COMMENT ON COLUMN CHECKINS.ACTION_TYPE IS 'Type of action: checkin (entry) or checkout (exit)';

-- Update existing records to have default 'checkin' action
UPDATE CHECKINS SET ACTION_TYPE = 'checkin' WHERE ACTION_TYPE IS NULL;

-- Commit changes
COMMIT;

-- Create index for better query performance
CREATE INDEX IDX_CHECKINS_ACTION ON CHECKINS(ACTION_TYPE);

-- Create index for combined queries (registration + action + session)
CREATE INDEX IDX_CHECKINS_REG_ACTION_SESSION ON CHECKINS(REGISTRATION_ID, ACTION_TYPE, SESSION_ID);

