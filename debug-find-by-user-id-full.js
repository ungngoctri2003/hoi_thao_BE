const { withConn } = require('./dist/config/db');
const oracledb = require('oracledb');

async function debugFindByUserIdFull() {
  try {
    console.log('=== Debug findByUserId Full Processing ===');
    
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
      
      if (result.rows && result.rows.length > 0) {
        const assignments = [];
        for (const row of result.rows) {
          console.log('Processing row:', {
            ID: row.ID,
            USERID: row.USERID,
            CONFERENCEID: row.CONFERENCEID,
            ISACTIVE: row.ISACTIVE,
            CONFERENCENAME: row.CONFERENCENAME
          });
          
          // Handle CLOB for permissions
          let permissions = '{}';
          if (row.PERMISSIONS) {
            if (typeof row.PERMISSIONS === 'string') {
              permissions = row.PERMISSIONS;
              console.log('Permissions is string:', permissions);
            } else if (row.PERMISSIONS.getData) {
              // It's a LOB object
              try {
                permissions = await row.PERMISSIONS.getData();
                console.log('Permissions from LOB:', permissions);
              } catch (error) {
                console.warn('Error reading LOB data:', error);
                permissions = '{}';
              }
            }
          }
          
          const assignment = {
            id: row.ID,
            userId: row.USERID,
            conferenceId: row.CONFERENCEID,
            permissions: permissions,
            assignedBy: row.ASSIGNEDBY,
            assignedAt: row.ASSIGNEDAT,
            isActive: row.ISACTIVE,
            createdAt: row.CREATEDAT,
            updatedAt: row.UPDATEDAT,
            conferenceName: row.CONFERENCENAME,
            conferenceStatus: row.CONFERENCESTATUS
          };
          
          console.log('Created assignment:', assignment);
          assignments.push(assignment);
        }
        return assignments;
      }
      
      return [];
    });
    
    console.log('Final result:', result);
    console.log('Result length:', result.length);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

debugFindByUserIdFull();
