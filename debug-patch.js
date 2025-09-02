const oracledb = require('oracledb');
require('dotenv').config();

async function debugPatch() {
  let connection;
  
  try {
    const dbConfig = {
      user: process.env.DB_USER || 'HOI_THAO',
      password: process.env.DB_PASSWORD || '21082003',
      connectString: process.env.DB_CONNECT_STRING || 'localhost:1521/XE'
    };
    
    console.log('Connecting to database...');
    connection = await oracledb.getConnection(dbConfig);
    console.log('Connected to database');
    
    // Test update with user ID 1
    const userId = 1;
    const data = {
      NAME: 'Test Update',
      AVATAR_URL: 'https://example.com/avatar.jpg'
    };
    
    console.log('Testing update with data:', data);
    console.log('User ID type:', typeof userId, 'Value:', userId);
    
    const fields = [];
    const binds = { id: userId };
    
    for (const key of Object.keys(data)) {
      fields.push(`${key} = :${key}`);
      binds[key] = data[key];
    }
    
    console.log('Fields:', fields);
    console.log('Binds:', binds);
    
    if (fields.length > 0) {
      const sql = `UPDATE APP_USERS SET ${fields.join(', ')} WHERE ID = :id`;
      console.log('SQL:', sql);
      
      await connection.execute(sql, binds, { autoCommit: true });
      console.log('Update successful');
      
      // Get updated user
      const result = await connection.execute(
        `SELECT ID, EMAIL, NAME, AVATAR_URL FROM APP_USERS WHERE ID = :id`,
        { id: userId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      
      console.log('Updated user:', result.rows[0]);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    if (connection) {
      await connection.close();
      console.log('Database connection closed');
    }
  }
}

debugPatch();
