// Script to add FEATURES to existing rooms
const oracledb = require('oracledb');

// Database configuration
const dbConfig = {
  user: process.env.DB_USER || 'your_username',
  password: process.env.DB_PASSWORD || 'your_password',
  connectString: process.env.DB_CONNECT_STRING || 'localhost:1521/XE',
};

// Define features for different room types and capacities
function getRoomFeatures(roomName, capacity, roomType) {
  const features = [];

  // Basic features based on capacity
  if (capacity >= 500) {
    features.push(
      'Hội trường lớn',
      'Hệ thống âm thanh chuyên nghiệp',
      'Máy chiếu 4K',
      'Hệ thống ánh sáng',
      'Sân khấu'
    );
  } else if (capacity >= 200) {
    features.push('Hội trường', 'Hệ thống âm thanh', 'Máy chiếu HD', 'Hệ thống ánh sáng');
  } else if (capacity >= 100) {
    features.push('Phòng hội nghị', 'Hệ thống âm thanh', 'Máy chiếu', 'Bảng trắng');
  } else if (capacity >= 50) {
    features.push('Phòng họp lớn', 'Hệ thống âm thanh', 'Máy chiếu', 'Bảng trắng', 'WiFi');
  } else if (capacity >= 20) {
    features.push('Phòng họp', 'Máy chiếu', 'Bảng trắng', 'WiFi', 'Máy lạnh');
  } else {
    features.push('Phòng nhỏ', 'Máy chiếu', 'Bảng trắng', 'WiFi');
  }

  // Additional features based on room name
  const name = roomName.toLowerCase();
  if (name.includes('workshop') || name.includes('xưởng')) {
    features.push('Bàn thực hành', 'Thiết bị thực hành', 'Khu vực demo');
  }
  if (name.includes('conference') || name.includes('hội nghị')) {
    features.push('Hệ thống video call', 'Ghi âm', 'Dịch thuật');
  }
  if (name.includes('meeting') || name.includes('họp')) {
    features.push('Bàn họp', 'Ghế xoay', 'Hệ thống video call');
  }
  if (name.includes('startup') || name.includes('khởi nghiệp')) {
    features.push('Không gian sáng tạo', 'Bảng viết', 'Khu vực networking');
  }
  if (name.includes('vip')) {
    features.push('Nội thất cao cấp', 'Điều hòa riêng', 'Dịch vụ đặc biệt');
  }

  // Features based on room type
  if (roomType === 'conference') {
    features.push('Hệ thống video call', 'Ghi âm', 'Dịch thuật');
  } else if (roomType === 'meeting') {
    features.push('Bàn họp', 'Ghế xoay');
  } else if (roomType === 'training') {
    features.push('Bàn thực hành', 'Thiết bị đào tạo');
  }

  // Common features for all rooms
  features.push('WiFi', 'Máy lạnh', 'Hệ thống chiếu sáng');

  // Remove duplicates and return
  return [...new Set(features)];
}

async function addFeaturesToRooms() {
  let connection;

  try {
    console.log('Connecting to database...');
    connection = await oracledb.getConnection(dbConfig);
    console.log('Connected to database successfully');

    // Get all rooms
    console.log('Fetching current room data...');
    const result = await connection.execute(
      `SELECT ID, NAME, CAPACITY, ROOM_TYPE FROM ROOMS ORDER BY ID`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const rooms = result.rows;
    console.log(`Found ${rooms.length} rooms`);

    // Process each room
    for (const room of rooms) {
      console.log(`\nProcessing room ${room.ID}: ${room.NAME}`);

      // Generate features for this room
      const features = getRoomFeatures(room.NAME, room.CAPACITY, room.ROOM_TYPE);
      console.log('Generated features:', features);

      // Update the room with features
      const updateResult = await connection.execute(
        `UPDATE ROOMS SET FEATURES = :features WHERE ID = :id`,
        {
          features: JSON.stringify(features),
          id: room.ID,
        },
        { autoCommit: false }
      );

      console.log(`Updated room ${room.ID}, rows affected: ${updateResult.rowsAffected}`);
    }

    // Commit all changes
    await connection.commit();
    console.log('\n✅ All changes committed successfully');
  } catch (error) {
    console.error('❌ Error adding features to rooms:', error);
    if (connection) {
      try {
        await connection.rollback();
        console.log('Rolled back changes due to error');
      } catch (rollbackError) {
        console.error('Error during rollback:', rollbackError);
      }
    }
  } finally {
    if (connection) {
      try {
        await connection.close();
        console.log('Database connection closed');
      } catch (closeError) {
        console.error('Error closing connection:', closeError);
      }
    }
  }
}

// Run the script
addFeaturesToRooms();
