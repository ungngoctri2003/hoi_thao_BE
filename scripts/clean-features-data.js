// Script to clean existing FEATURES data in the database
const oracledb = require('oracledb');

// Database configuration
const dbConfig = {
  user: process.env.DB_USER || 'your_username',
  password: process.env.DB_PASSWORD || 'your_password',
  connectString: process.env.DB_CONNECT_STRING || 'localhost:1521/XE',
};

async function cleanFeaturesData() {
  let connection;

  try {
    console.log('Connecting to database...');
    connection = await oracledb.getConnection(dbConfig);
    console.log('Connected to database successfully');

    // Get all rooms with their current FEATURES
    console.log('Fetching current room data...');
    const result = await connection.execute(
      `SELECT ID, NAME, FEATURES FROM ROOMS ORDER BY ID`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const rooms = result.rows;
    console.log(`Found ${rooms.length} rooms`);

    // Process each room
    for (const room of rooms) {
      console.log(`\nProcessing room ${room.ID}: ${room.NAME}`);
      console.log('Current FEATURES:', room.FEATURES);

      let cleanedFeatures = [];

      if (room.FEATURES) {
        try {
          // Parse FEATURES if it's a JSON string
          let featuresArray;
          if (typeof room.FEATURES === 'string') {
            featuresArray = JSON.parse(room.FEATURES);
          } else if (Array.isArray(room.FEATURES)) {
            featuresArray = room.FEATURES;
          } else {
            featuresArray = [];
          }

          // Clean the features array
          cleanedFeatures = featuresArray
            .map(feature => {
              if (typeof feature === 'string') {
                const cleaned = feature.trim();
                // Skip invalid or auto-generated values
                if (
                  !cleaned ||
                  cleaned === 'null' ||
                  cleaned === 'undefined' ||
                  cleaned === '[object Object]' ||
                  cleaned === 'DB_TYPE_CLOB' ||
                  cleaned === 'Có sẵn' ||
                  cleaned === 'Không có' ||
                  cleaned.startsWith('Tính năng ')
                ) {
                  return null;
                }
                return cleaned;
              }
              return null;
            })
            .filter(feature => feature !== null && feature !== undefined);
        } catch (error) {
          console.warn(`Error parsing FEATURES for room ${room.ID}:`, error.message);
          cleanedFeatures = [];
        }
      }

      console.log('Cleaned FEATURES:', cleanedFeatures);

      // Update the room with cleaned features
      const updateResult = await connection.execute(
        `UPDATE ROOMS SET FEATURES = :features WHERE ID = :id`,
        {
          features: cleanedFeatures.length > 0 ? JSON.stringify(cleanedFeatures) : null,
          id: room.ID,
        },
        { autoCommit: false }
      );

      console.log(`Updated room ${room.ID}, rows affected: ${updateResult.rowsAffected}`);
    }

    // Commit all changes
    await connection.commit();
    console.log('\nAll changes committed successfully');
  } catch (error) {
    console.error('Error cleaning features data:', error);
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

// Run the cleanup
cleanFeaturesData();
