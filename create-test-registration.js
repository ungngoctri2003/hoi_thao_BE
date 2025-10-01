const oracledb = require('oracledb');

// Test QR code data
const testQRData = {
  id: 1,
  conf: 34,
  t: Date.now(),
  type: 'attendee_registration',
  v: '2.0'
};
const qrString = JSON.stringify(testQRData);

console.log('Test QR Code:', qrString);

// Database config (simplified)
const config = {
  user: process.env.DB_USER || 'system',
  password: process.env.DB_PASSWORD || 'oracle',
  connectString: process.env.DB_CONNECT_STRING || 'localhost:1521/XE'
};

async function createTestRegistration() {
  let conn;
  try {
    console.log('Connecting to database...');
    conn = await oracledb.getConnection(config);
    
    // First, create a test attendee
    console.log('Creating test attendee...');
    const attendeeResult = await conn.execute(
      `INSERT INTO ATTENDEES (NAME, EMAIL, PHONE, COMPANY, POSITION, AVATAR_URL, DIETARY, SPECIAL_NEEDS, DATE_OF_BIRTH, GENDER, FIREBASE_UID) 
       VALUES (:name, :email, :phone, :company, :position, :avatarUrl, :dietary, :specialNeeds, :dateOfBirth, :gender, :firebaseUid) 
       RETURNING ID INTO :id`,
      {
        name: 'Test User',
        email: 'test@example.com',
        phone: '0123456789',
        company: 'Test Company',
        position: 'Test Position',
        avatarUrl: null,
        dietary: null,
        specialNeeds: null,
        dateOfBirth: null,
        gender: null,
        firebaseUid: null,
        id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
      },
      { autoCommit: true }
    );
    
    const attendeeId = attendeeResult.outBinds.id[0];
    console.log('Created attendee with ID:', attendeeId);
    
    // Then, create a registration with QR code
    console.log('Creating test registration...');
    const registrationResult = await conn.execute(
      `INSERT INTO REGISTRATIONS (ATTENDEE_ID, CONFERENCE_ID, REGISTRATION_DATE, STATUS, QR_CODE) 
       VALUES (:attendeeId, :conferenceId, SYSTIMESTAMP, :status, :qrCode) 
       RETURNING ID INTO :id`,
      {
        attendeeId: attendeeId,
        conferenceId: 34,
        status: 'registered',
        qrCode: qrString,
        id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
      },
      { autoCommit: true }
    );
    
    const registrationId = registrationResult.outBinds.id[0];
    console.log('Created registration with ID:', registrationId);
    console.log('QR Code stored:', qrString);
    
    // Verify the registration
    const verifyResult = await conn.execute(
      'SELECT ID, ATTENDEE_ID, CONFERENCE_ID, QR_CODE FROM REGISTRATIONS WHERE ID = :id',
      { id: registrationId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    
    console.log('Verification result:', verifyResult.rows[0]);
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    if (conn) {
      await conn.close();
    }
  }
}

createTestRegistration();
