const { withConn } = require('./dist/config/db');
const oracledb = require('oracledb');

async function debugFindByUserId() {
  try {
    console.log('=== Debug findByUserId ===');
    
    const userId = 5; // User tri
    
    const result = await withConn(async (conn) => {
      const query = `
        SELECT uca.id, uca.user_id as userId, uca.conference_id as conferenceId, 
               uca.permissions, uca.assigned_by as assignedBy, uca.assigned_at as assignedAt,
               uca.is_active as isActive, uca.created_at as createdAt, uca.updated_at as updatedAt,
               c.name as conferenceName, c.status as conferenceStatus
        FROM user_conference_assignments uca
        JOIN conferences c ON uca.conference_id = c.ID
        WHERE uca.user_id = :userId AND uca.is_active = 1
        ORDER BY uca.assigned_at DESC
      `;
      
      const result = await conn.execute(query, { userId }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
      return result;
    });
    
    console.log('Query result:', result);
    console.log('Rows count:', result.rows ? result.rows.length : 0);
    
    if (result.rows && result.rows.length > 0) {
      console.log('First row:', result.rows[0]);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

debugFindByUserId();
