require('dotenv').config();
const oracledb = require('oracledb');

async function checkRoomsTable() {
  let connection;

  try {
    // Kết nối database
    connection = await oracledb.getConnection({
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      connectString: process.env.DB_CONNECT_STRING,
    });

    console.log('Connected to Oracle Database');

    // Kiểm tra cấu trúc bảng ROOMS
    const result = await connection.execute(`
      SELECT COLUMN_NAME, DATA_TYPE, DATA_LENGTH, NULLABLE 
      FROM USER_TAB_COLUMNS 
      WHERE TABLE_NAME = 'ROOMS' 
      ORDER BY COLUMN_ID
    `);

    console.log('\nCấu trúc bảng ROOMS:');
    console.log('COLUMN_NAME\t\tDATA_TYPE\t\tDATA_LENGTH\tNULLABLE');
    console.log('-'.repeat(80));

    result.rows.forEach(row => {
      console.log(`${row[0]}\t\t${row[1]}\t\t${row[2]}\t\t${row[3]}`);
    });

    // Kiểm tra xem các cột mới có tồn tại không
    const newColumns = ['DESCRIPTION', 'ROOM_TYPE', 'FEATURES'];
    const existingColumns = result.rows.map(row => row[0]);

    console.log('\nKiểm tra các cột mới:');
    newColumns.forEach(col => {
      if (existingColumns.includes(col)) {
        console.log(`✅ ${col} - Đã tồn tại`);
      } else {
        console.log(`❌ ${col} - Chưa tồn tại`);
      }
    });
  } catch (err) {
    console.error('Lỗi:', err.message);
  } finally {
    if (connection) {
      try {
        await connection.close();
        console.log('\nĐã đóng kết nối database');
      } catch (err) {
        console.error('Lỗi khi đóng kết nối:', err.message);
      }
    }
  }
}

checkRoomsTable();
