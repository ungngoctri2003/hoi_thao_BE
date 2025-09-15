-- Add new fields to ROOMS table
ALTER TABLE ROOMS ADD (
    DESCRIPTION VARCHAR2(1000),
    ROOM_TYPE VARCHAR2(50),
    FEATURES CLOB
);

-- Add comments for the new fields
COMMENT ON COLUMN ROOMS.DESCRIPTION IS 'Room description';
COMMENT ON COLUMN ROOMS.ROOM_TYPE IS 'Type of room (meeting, conference, training, vip, workshop)';
COMMENT ON COLUMN ROOMS.FEATURES IS 'JSON array of room features stored as CLOB';
