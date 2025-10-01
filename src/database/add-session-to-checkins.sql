-- Add SESSION_ID column to CHECKINS table to support session-level check-ins
-- This allows tracking which session an attendee checked in to

-- Add SESSION_ID column (nullable to support both conference and session check-ins)
ALTER TABLE CHECKINS ADD SESSION_ID NUMBER;

-- Add foreign key constraint
ALTER TABLE CHECKINS ADD CONSTRAINT FK_CHECKINS_SESSION 
    FOREIGN KEY (SESSION_ID) REFERENCES SESSIONS(ID) ON DELETE CASCADE;

-- Create index for better query performance
CREATE INDEX IDX_CHECKINS_SESSION ON CHECKINS(SESSION_ID);

-- Create index for combined queries
CREATE INDEX IDX_CHECKINS_REG_SESSION ON CHECKINS(REGISTRATION_ID, SESSION_ID);

-- Add comment for documentation
COMMENT ON COLUMN CHECKINS.SESSION_ID IS 'Optional session ID - NULL means check-in for entire conference, non-NULL means check-in for specific session';

