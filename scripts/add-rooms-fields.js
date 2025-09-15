const oracledb = require('oracledb');

async function addRoomsFields() {
  let connection;

  try {
    // Kết nối database với thông tin mặc định
    connection = await oracledb.getConnection({
      user: 'system',
      password: 'oracle',
      connectString: 'localhost:1521/XE',
    });

    console.log('Connected to Oracle Database');

    // Kiểm tra xem các cột đã tồn tại chưa
    const checkResult = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM USER_TAB_COLUMNS 
      WHERE TABLE_NAME = 'ROOMS' 
      AND COLUMN_NAME IN ('DESCRIPTION', 'ROOM_TYPE', 'FEATURES')
    `);

    const existingColumns = checkResult.rows.map(row => row[0]);
    console.log('Existing columns:', existingColumns);

    // Thêm cột DESCRIPTION nếu chưa có
    if (!existingColumns.includes('DESCRIPTION')) {
      console.log('Adding DESCRIPTION column...');
      await connection.execute(`
        ALTER TABLE ROOMS ADD DESCRIPTION VARCHAR2(1000)
      `);
      console.log('✅ DESCRIPTION column added');
    } else {
      console.log('✅ DESCRIPTION column already exists');
    }

    // Thêm cột ROOM_TYPE nếu chưa có
    if (!existingColumns.includes('ROOM_TYPE')) {
      console.log('Adding ROOM_TYPE column...');
      await connection.execute(`
        ALTER TABLE ROOMS ADD ROOM_TYPE VARCHAR2(50)
      `);
      console.log('✅ ROOM_TYPE column added');
    } else {
      console.log('✅ ROOM_TYPE column already exists');
    }

    // Thêm cột FEATURES nếu chưa có
    if (!existingColumns.includes('FEATURES')) {
      console.log('Adding FEATURES column...');
      await connection.execute(`
        ALTER TABLE ROOMS ADD FEATURES CLOB
      `);
      console.log('✅ FEATURES column added');
    } else {
      console.log('✅ FEATURES column already exists');
    }

    // Thêm comments
    try {
      await connection.execute(`
        COMMENT ON COLUMN ROOMS.DESCRIPTION IS 'Room description'
      `);
      console.log('✅ Added comment for DESCRIPTION');
    } catch (e) {
      console.log('Comment for DESCRIPTION already exists or failed:', e.message);
    }

    try {
      await connection.execute(`
        COMMENT ON COLUMN ROOMS.ROOM_TYPE IS 'Type of room (meeting, conference, training, vip, workshop)'
      `);
      console.log('✅ Added comment for ROOM_TYPE');
    } catch (e) {
      console.log('Comment for ROOM_TYPE already exists or failed:', e.message);
    }

    try {
      await connection.execute(`
        COMMENT ON COLUMN ROOMS.FEATURES IS 'JSON array of room features stored as CLOB'
      `);
      console.log('✅ Added comment for FEATURES');
    } catch (e) {
      console.log('Comment for FEATURES already exists or failed:', e.message);
    }

    console.log('\n🎉 Migration completed successfully!');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);

    // Thử với thông tin kết nối khác
    if (err.message.includes('invalid username/password')) {
      console.log('\nTrying alternative connection...');
      try {
        connection = await oracledb.getConnection({
          user: 'hr',
          password: 'hr',
          connectString: 'localhost:1521/XE',
        });
        console.log('Connected with hr/hr credentials');
        // Retry migration logic here if needed
      } catch (e2) {
        console.error('Alternative connection also failed:', e2.message);
      }
    }
  } finally {
    if (connection) {
      try {
        await connection.close();
        console.log('\nDatabase connection closed');
      } catch (err) {
        console.error('Error closing connection:', err.message);
      }
    }
  }
}

addRoomsFields();
