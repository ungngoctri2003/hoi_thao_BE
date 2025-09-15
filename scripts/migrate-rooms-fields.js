require('dotenv').config();
const oracledb = require('oracledb');

async function migrateRoomsFields() {
  let connection;

  try {
    // Sử dụng cấu hình từ .env
    connection = await oracledb.getConnection({
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      connectString: process.env.DB_CONNECT_STRING,
    });

    console.log('✅ Connected to Oracle Database');
    console.log(`Using: ${process.env.DB_USER}@${process.env.DB_CONNECT_STRING}`);

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
    console.log('You can now use the updated rooms API with the new fields.');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    console.error('Full error:', err);
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

migrateRoomsFields();
