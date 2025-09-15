import { withConn } from '../../config/db';
import oracledb from 'oracledb';

type UserRow = {
  ID: number;
  EMAIL: string;
  NAME: string;
  PASSWORD_HASH: string | null;
  STATUS?: string | null;
  FIREBASE_UID?: string | null;
  AVATAR_URL?: string | null;
  ROLE_CODE?: string | null;
};

export const usersRepository = {
  async list(page: number, limit: number) {
    const offset = (page - 1) * limit;
    return withConn(async conn => {
      const listRes = await conn.execute(
        `SELECT * FROM (
           SELECT t.*, ROWNUM rn FROM (
             SELECT u.ID, u.EMAIL, u.NAME, u.STATUS, u.CREATED_AT, u.LAST_LOGIN, u.AVATAR_URL, 
                    (SELECT r.CODE FROM USER_ROLES ur2 JOIN ROLES r ON ur2.ROLE_ID = r.ID WHERE ur2.USER_ID = u.ID ORDER BY r.ID FETCH FIRST 1 ROWS ONLY) as ROLE_CODE
             FROM APP_USERS u
             ORDER BY u.CREATED_AT DESC
           ) t WHERE ROWNUM <= :max_row
         ) WHERE rn > :min_row`,
        { max_row: offset + limit, min_row: offset },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      const countRes = await conn.execute(
        `SELECT COUNT(*) AS CNT FROM APP_USERS`,
        {},
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      const rows = (listRes.rows as any[]) || [];
      const total = Number((countRes.rows as Array<{ CNT: number }>)[0]?.CNT || 0);
      return { rows, total };
    });
  },

  async findById(id: number): Promise<UserRow | null> {
    return withConn(async conn => {
      console.log('findById called with id:', id, 'type:', typeof id);

      // Validate id before using it
      if (isNaN(id) || id <= 0) {
        console.error('Invalid id in findById:', id);
        throw new Error(`Invalid user ID: ${id}`);
      }

      const res = await conn.execute(
        `SELECT u.ID, u.EMAIL, u.NAME, u.PASSWORD_HASH, u.STATUS, u.FIREBASE_UID, u.AVATAR_URL, 
                (SELECT r.CODE FROM USER_ROLES ur2 JOIN ROLES r ON ur2.ROLE_ID = r.ID WHERE ur2.USER_ID = u.ID ORDER BY r.ID FETCH FIRST 1 ROWS ONLY) as ROLE_CODE
         FROM APP_USERS u
         WHERE u.ID = :id`,
        { id },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      const rows = (res.rows as any[]) || [];
      return (rows[0] as UserRow) || null;
    });
  },

  async getUserRole(userId: number): Promise<{ role_code: string } | null> {
    return withConn(async conn => {
      const res = await conn.execute(
        `SELECT r.CODE as role_code 
         FROM USER_ROLES ur 
         JOIN ROLES r ON ur.ROLE_ID = r.ID 
         WHERE ur.USER_ID = :user_id ORDER BY r.ID FETCH FIRST 1 ROWS ONLY`,
        { user_id: userId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      const rows = (res.rows as any[]) || [];
      return (rows[0] as { role_code: string }) || null;
    });
  },
  async findByEmail(email: string): Promise<UserRow | null> {
    return withConn(async conn => {
      const res = await conn.execute(
        `SELECT ID, EMAIL, NAME, PASSWORD_HASH, STATUS, FIREBASE_UID, AVATAR_URL FROM APP_USERS WHERE EMAIL = :email`,
        { email },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      const rows = (res.rows as any[]) || [];
      return (rows[0] as UserRow) || null;
    });
  },

  async create(data: {
    EMAIL: string;
    NAME: string;
    PASSWORD_HASH: string | null;
    FIREBASE_UID?: string | null;
    AVATAR_URL?: string | null;
  }): Promise<UserRow> {
    return withConn(async conn => {
      // Build dynamic query based on available data
      const fields = ['EMAIL', 'NAME'];
      const values = [':email', ':name'];
      const bindParams: any = {
        EMAIL: data.EMAIL,
        NAME: data.NAME,
        id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
      };

      // Add optional fields only if they have values
      if (data.PASSWORD_HASH !== null && data.PASSWORD_HASH !== undefined) {
        fields.push('PASSWORD_HASH');
        values.push(':PASSWORD_HASH');
        bindParams.PASSWORD_HASH = data.PASSWORD_HASH;
      }

      if (data.FIREBASE_UID !== null && data.FIREBASE_UID !== undefined) {
        fields.push('FIREBASE_UID');
        values.push(':FIREBASE_UID');
        bindParams.FIREBASE_UID = data.FIREBASE_UID;
      }

      if (data.AVATAR_URL !== null && data.AVATAR_URL !== undefined) {
        fields.push('AVATAR_URL');
        values.push(':AVATAR_URL');
        bindParams.AVATAR_URL = data.AVATAR_URL;
      }

      const query = `INSERT INTO APP_USERS (${fields.join(', ')}) VALUES (${values.join(
        ', '
      )}) RETURNING ID INTO :id`;

      console.log('Creating user with query:', query);
      console.log('Bind params:', bindParams);

      const res = await conn.execute(query, bindParams, { autoCommit: true });

      const id = (res.outBinds as { id: number[] }).id[0];
      if (!id) throw new Error('Failed to get created ID');

      return {
        ID: id,
        EMAIL: data.EMAIL,
        NAME: data.NAME,
        PASSWORD_HASH: data.PASSWORD_HASH,
        FIREBASE_UID: data.FIREBASE_UID || null,
        AVATAR_URL: data.AVATAR_URL || null,
      };
    });
  },

  async getPermissions(userId: number): Promise<string[]> {
    return withConn(async conn => {
      const res = await conn.execute(
        `SELECT p.CODE as CODE
         FROM USER_ROLES ur
         JOIN ROLES r ON r.ID = ur.ROLE_ID
         JOIN ROLE_PERMISSIONS rp ON rp.ROLE_ID = r.ID
         JOIN PERMISSIONS p ON p.ID = rp.PERMISSION_ID
         WHERE ur.USER_ID = :user_id`,
        { user_id: userId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      const rows = (res.rows as any[]) || [];
      return rows.map(r => r.CODE as string);
    });
  },
  async updateLastLogin(id: number) {
    return withConn(async conn => {
      await conn.execute(
        `UPDATE APP_USERS SET LAST_LOGIN = SYSTIMESTAMP WHERE ID = :id`,
        { id },
        { autoCommit: true }
      );
    });
  },

  async update(
    id: number,
    data: Partial<{
      EMAIL: string;
      NAME: string;
      PASSWORD_HASH: string | null;
      STATUS: string;
      AVATAR_URL: string;
      FIREBASE_UID: string;
    }>
  ) {
    return withConn(async conn => {
      const fields: string[] = [];
      const binds: any = { id };
      for (const key of Object.keys(data)) {
        fields.push(`${key} = :${key}`);
        binds[key] = (data as Record<string, any>)[key];
      }
      if (fields.length === 0) return usersRepository.findById(id);
      await conn.execute(`UPDATE APP_USERS SET ${fields.join(', ')} WHERE ID = :id`, binds, {
        autoCommit: true,
      });
      return usersRepository.findById(id);
    });
  },

  async remove(id: number) {
    return withConn(async conn => {
      await conn.execute(`DELETE FROM APP_USERS WHERE ID = :id`, { id }, { autoCommit: true });
    });
  },

  async assignRole(userId: number, roleId: number) {
    return withConn(async conn => {
      await conn.execute(
        `INSERT INTO USER_ROLES (USER_ID, ROLE_ID) VALUES (:user_id, :role_id)`,
        { user_id: userId, role_id: roleId },
        { autoCommit: true }
      );
    });
  },

  async removeRole(userId: number, roleId: number) {
    return withConn(async conn => {
      await conn.execute(
        `DELETE FROM USER_ROLES WHERE USER_ID = :user_id AND ROLE_ID = :role_id`,
        { user_id: userId, role_id: roleId },
        { autoCommit: true }
      );
    });
  },

  async removeAllRoles(userId: number) {
    return withConn(async conn => {
      await conn.execute(
        `DELETE FROM USER_ROLES WHERE USER_ID = :user_id`,
        { user_id: userId },
        { autoCommit: true }
      );
    });
  },

  async listRoles(userId: number) {
    return withConn(async conn => {
      const res = await conn.execute(
        `SELECT r.ID, r.CODE, r.NAME FROM USER_ROLES ur JOIN ROLES r ON r.ID = ur.ROLE_ID WHERE ur.USER_ID = :user_id`,
        { user_id: userId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      return (res.rows as any[]) || [];
    });
  },
  async setPassword(id: number, passwordHash: string) {
    return withConn(async conn => {
      await conn.execute(
        `UPDATE APP_USERS SET PASSWORD_HASH = :hash WHERE ID = :id`,
        { hash: passwordHash, id },
        { autoCommit: true }
      );
    });
  },

  async findRoleByCode(roleCode: string) {
    return withConn(async conn => {
      const res = await conn.execute(
        `SELECT ID, CODE, NAME FROM ROLES WHERE CODE = :code`,
        { code: roleCode },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      const rows = (res.rows as any[]) || [];
      return rows[0] || null;
    });
  },

  async getUsersByRole(roleId: number) {
    return withConn(async conn => {
      const res = await conn.execute(
        `SELECT u.ID, u.EMAIL, u.NAME, u.STATUS, u.AVATAR_URL 
         FROM APP_USERS u 
         JOIN USER_ROLES ur ON u.ID = ur.USER_ID 
         WHERE ur.ROLE_ID = :role_id`,
        { role_id: roleId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      return (res.rows as any[]) || [];
    });
  },

  async findAll() {
    return withConn(async conn => {
      const res = await conn.execute(
        `SELECT ID, EMAIL, NAME, STATUS, AVATAR_URL FROM APP_USERS ORDER BY ID`,
        {},
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      return (res.rows as any[]) || [];
    });
  },

  async listAllUsers(page: number, limit: number) {
    const offset = (page - 1) * limit;
    return withConn(async conn => {
      // Union APP_USERS and ATTENDEES to get all users
      const listRes = await conn.execute(
        `SELECT * FROM (
           SELECT t.*, ROWNUM rn FROM (
             SELECT 
               u.ID, 
               u.EMAIL, 
               u.NAME, 
               u.STATUS, 
               u.CREATED_AT, 
               u.LAST_LOGIN, 
               u.AVATAR_URL,
               'app_user' as USER_TYPE,
               (SELECT r.CODE FROM USER_ROLES ur2 JOIN ROLES r ON ur2.ROLE_ID = r.ID WHERE ur2.USER_ID = u.ID ORDER BY r.ID FETCH FIRST 1 ROWS ONLY) as ROLE_CODE
             FROM APP_USERS u
             UNION ALL
             SELECT 
               a.ID + 10000 as ID,  -- Offset to avoid ID conflicts
               a.EMAIL, 
               a.NAME, 
               'active' as STATUS,
               a.CREATED_AT,
               NULL as LAST_LOGIN,
               a.AVATAR_URL,
               'attendee' as USER_TYPE,
               'attendee' as ROLE_CODE
             FROM ATTENDEES a
             ORDER BY NAME
           ) t WHERE ROWNUM <= :max_row
         ) WHERE rn > :min_row`,
        { max_row: offset + limit, min_row: offset },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      const countRes = await conn.execute(
        `SELECT COUNT(*) AS CNT FROM (
           SELECT ID FROM APP_USERS
           UNION ALL
           SELECT ID + 10000 FROM ATTENDEES
         )`,
        {},
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      const rows = (listRes.rows as any[]) || [];
      const total = Number((countRes.rows as Array<{ CNT: number }>)[0]?.CNT || 0);
      return { rows, total };
    });
  },

  // Get users who have sent messages or have been added to messaging system
  async getUsersWithMessages() {
    return withConn(async conn => {
      try {
        // Try to get users from MESSAGING_USERS table if it exists
        let messagingUsers: any[] = [];
        try {
          const messagingUsersQuery = `
            SELECT DISTINCT
              u.ID,
              u.EMAIL,
              u.NAME,
              u.STATUS,
              u.CREATED_AT,
              u.LAST_LOGIN,
              u.AVATAR_URL,
              'app_user' as USER_TYPE,
              (SELECT r.CODE FROM USER_ROLES ur2 JOIN ROLES r ON ur2.ROLE_ID = r.ID WHERE ur2.USER_ID = u.ID ORDER BY r.ID FETCH FIRST 1 ROWS ONLY) as ROLE_CODE,
              mu.ADDED_AT as ADDED_TO_MESSAGING_AT,
              mu.MESSAGE_COUNT,
              mu.LAST_MESSAGE_TIME
            FROM APP_USERS u
            JOIN MESSAGING_USERS mu ON u.ID = mu.USER_ID
            WHERE mu.IS_ACTIVE = 1
              AND u.STATUS = 'active'
              AND mu.USER_TYPE = 'app_user'
            
            UNION
            
            SELECT DISTINCT
              a.ID,
              a.EMAIL,
              a.NAME,
              'active' as STATUS,
              a.CREATED_AT,
              NULL as LAST_LOGIN,
              a.AVATAR_URL,
              'attendee' as USER_TYPE,
              'attendee' as ROLE_CODE,
              mu.ADDED_AT as ADDED_TO_MESSAGING_AT,
              mu.MESSAGE_COUNT,
              mu.LAST_MESSAGE_TIME
            FROM ATTENDEES a
            JOIN MESSAGING_USERS mu ON a.ID = mu.USER_ID
            WHERE mu.IS_ACTIVE = 1
              AND mu.USER_TYPE = 'attendee'
              AND a.EMAIL IS NOT NULL
          `;

          const messagingResult = await conn.execute(
            messagingUsersQuery,
            {},
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
          );
          messagingUsers = (messagingResult.rows as any[]) || [];
        } catch (messagingTableError) {
          console.log('MESSAGING_USERS table does not exist, using fallback method');
          // messagingUsers will remain empty array
        }

        // Get users who have actually sent messages (to update message counts)
        let messageUsers: any[] = [];
        try {
          const messageQuery = `
            SELECT DISTINCT
              u.ID,
              u.EMAIL,
              u.NAME,
              u.STATUS,
              u.CREATED_AT,
              u.LAST_LOGIN,
              u.AVATAR_URL,
              'app_user' as USER_TYPE,
              (SELECT r.CODE FROM USER_ROLES ur2 JOIN ROLES r ON ur2.ROLE_ID = r.ID WHERE ur2.USER_ID = u.ID ORDER BY r.ID FETCH FIRST 1 ROWS ONLY) as ROLE_CODE,
              COUNT(m.ID) as MESSAGE_COUNT,
              MAX(m.TS) as LAST_MESSAGE_TIME
            FROM APP_USERS u
            JOIN ATTENDEES a ON u.EMAIL = a.EMAIL
            JOIN MESSAGES m ON a.ID = m.ATTENDEE_ID
            WHERE u.STATUS = 'active'
            GROUP BY u.ID, u.EMAIL, u.NAME, u.STATUS, u.CREATED_AT, u.LAST_LOGIN, u.AVATAR_URL
          `;

          const messageResult = await conn.execute(
            messageQuery,
            {},
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
          );
          messageUsers = (messageResult.rows as any[]) || [];
        } catch (messageError) {
          console.log('MESSAGES table may not exist or be accessible:', messageError);
        }

        // Combine both lists, prioritizing users with actual messages
        const allUsers = new Map();

        // Add users with actual messages first
        messageUsers.forEach(user => {
          allUsers.set(user.ID, {
            id: user.ID,
            email: user.EMAIL,
            name: user.NAME,
            status: user.STATUS,
            createdAt: user.CREATED_AT,
            lastLogin: user.LAST_LOGIN,
            avatar: user.AVATAR_URL,
            userType: user.USER_TYPE,
            role: user.ROLE_CODE,
            messageCount: user.MESSAGE_COUNT,
            lastMessageTime: user.LAST_MESSAGE_TIME,
            addedToMessagingAt: null,
            hasMessagingPermission: true,
          });
        });

        // Add users from MESSAGING_USERS (if not already added)
        messagingUsers.forEach(user => {
          if (!allUsers.has(user.ID)) {
            allUsers.set(user.ID, {
              id: user.ID,
              email: user.EMAIL,
              name: user.NAME,
              status: user.STATUS,
              createdAt: user.CREATED_AT,
              lastLogin: user.LAST_LOGIN,
              avatar: user.AVATAR_URL,
              userType: user.USER_TYPE,
              role: user.ROLE_CODE,
              messageCount: user.MESSAGE_COUNT || 0,
              lastMessageTime: user.LAST_MESSAGE_TIME,
              addedToMessagingAt: user.ADDED_TO_MESSAGING_AT,
              hasMessagingPermission: true,
            });
          }
        });

        const result = Array.from(allUsers.values());

        // Sort by last message time (desc) or added to messaging time (desc)
        result.sort((a, b) => {
          const aTime = a.lastMessageTime || a.addedToMessagingAt;
          const bTime = b.lastMessageTime || b.addedToMessagingAt;
          if (!aTime && !bTime) return 0;
          if (!aTime) return 1;
          if (!bTime) return -1;
          return new Date(bTime).getTime() - new Date(aTime).getTime();
        });

        console.log(`Found ${result.length} users in messaging system`);
        return result;
      } catch (error) {
        console.error('Error in getUsersWithMessages:', error);
        return [];
      }
    });
  },

  // Test database connection
  async testConnection() {
    return withConn(async conn => {
      try {
        const result = await conn.execute(
          'SELECT 1 as TEST FROM DUAL',
          {},
          { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        return result.rows;
      } catch (error) {
        console.error('Database connection test failed:', error);
        throw error;
      }
    });
  },

  // Get available users for adding to chat (all users except current user)
  async getAvailableUsers(current_user_id?: number) {
    return withConn(async conn => {
      try {
        // Query to get both APP_USERS and ATTENDEES using UNION, avoiding duplicates
        let query = `
          SELECT 
            u.ID,
            u.EMAIL,
            u.NAME,
            u.STATUS,
            u.CREATED_AT,
            u.LAST_LOGIN,
            u.AVATAR_URL,
            'app_user' as USER_TYPE,
            COALESCE(a.COMPANY, '') as COMPANY,
            COALESCE(a.POSITION, '') as POSITION
          FROM APP_USERS u
          LEFT JOIN (
            SELECT DISTINCT EMAIL, COMPANY, POSITION 
            FROM ATTENDEES 
            WHERE EMAIL IS NOT NULL
          ) a ON u.EMAIL = a.EMAIL
          WHERE u.STATUS = 'active'
          
          UNION
          
          SELECT 
            a.ID,
            a.EMAIL,
            a.NAME,
            'active' as STATUS,
            a.CREATED_AT,
            NULL as LAST_LOGIN,
            a.AVATAR_URL,
            'attendee' as USER_TYPE,
            COALESCE(a.COMPANY, '') as COMPANY,
            COALESCE(a.POSITION, '') as POSITION
          FROM ATTENDEES a
          WHERE a.EMAIL IS NOT NULL 
            AND a.EMAIL NOT IN (SELECT EMAIL FROM APP_USERS WHERE STATUS = 'active' AND EMAIL IS NOT NULL)
        `;

        let binds: any = {};

        // Ensure current_user_id is a valid number before using it
        if (
          current_user_id !== undefined &&
          current_user_id !== null &&
          !isNaN(Number(current_user_id))
        ) {
          const validUserId = Number(current_user_id);
          // Wrap the entire query to exclude current user
          query = `
            SELECT * FROM (
              ${query}
            ) WHERE ID != :current_user_id
          `;
          binds.current_user_id = validUserId;
          console.log('Excluding current user ID:', validUserId);
        } else {
          console.log('No valid current user ID provided, returning all users');
        }

        query += ' ORDER BY NAME';

        console.log('Executing getAvailableUsers query:', query);
        console.log('With binds:', binds);

        const result = await conn.execute(query, binds, { outFormat: oracledb.OUT_FORMAT_OBJECT });
        const rows = (result.rows as any[]) || [];

        console.log('Query result rows count before deduplication:', rows.length);

        // Remove duplicates based on email (keep app_user over attendee if both exist)
        const uniqueUsers = new Map();
        rows.forEach(row => {
          const email = row.EMAIL;
          if (email && !uniqueUsers.has(email)) {
            uniqueUsers.set(email, row);
          } else if (email && uniqueUsers.has(email)) {
            // If both app_user and attendee exist, keep app_user
            const existing = uniqueUsers.get(email);
            if (existing.USER_TYPE === 'attendee' && row.USER_TYPE === 'app_user') {
              uniqueUsers.set(email, row);
            }
          }
        });

        const deduplicatedRows = Array.from(uniqueUsers.values());
        console.log('Query result rows count after deduplication:', deduplicatedRows.length);

        // Get roles separately to avoid complex subqueries
        const usersWithRoles = await Promise.all(
          deduplicatedRows.map(async row => {
            try {
              let role = 'attendee'; // default role

              // Only get role from USER_ROLES for app_user type
              if (row.USER_TYPE === 'app_user') {
                const roleResult = await conn.execute(
                  `SELECT r.CODE FROM USER_ROLES ur JOIN ROLES r ON ur.ROLE_ID = r.ID WHERE ur.USER_ID = :user_id ORDER BY r.ID FETCH FIRST 1 ROWS ONLY`,
                  { user_id: row.ID },
                  { outFormat: oracledb.OUT_FORMAT_OBJECT }
                );
                const roleRows = (roleResult.rows as any[]) || [];
                role = roleRows.length > 0 ? roleRows[0].CODE : 'attendee';
              } else {
                // For attendee type, use 'attendee' as default role
                role = 'attendee';
              }

              return {
                id: row.ID,
                email: row.EMAIL,
                name: row.NAME,
                status: row.STATUS,
                createdAt: row.CREATED_AT,
                lastLogin: row.LAST_LOGIN,
                avatar: row.AVATAR_URL,
                userType: row.USER_TYPE,
                role: role,
                company: row.COMPANY,
                position: row.POSITION,
              };
            } catch (roleError) {
              console.warn(`Could not get role for user ${row.ID}:`, roleError);
              return {
                id: row.ID,
                email: row.EMAIL,
                name: row.NAME,
                status: row.STATUS,
                createdAt: row.CREATED_AT,
                lastLogin: row.LAST_LOGIN,
                avatar: row.AVATAR_URL,
                userType: row.USER_TYPE,
                role: 'attendee', // default role
                company: row.COMPANY,
                position: row.POSITION,
              };
            }
          })
        );

        return usersWithRoles;
      } catch (error) {
        console.error('Error in getAvailableUsers:', error);
        throw error;
      }
    });
  },

  // Get users by conference category (conference users, system users, non-conference users)
  async getUsersByConferenceCategory(conferenceId?: number, current_user_id?: number) {
    return withConn(async conn => {
      try {
        console.log('getUsersByConferenceCategory called with:', { conferenceId, current_user_id });

        // Get all users and categorize them properly
        let query = `
          SELECT 
            u.ID,
            u.EMAIL,
            u.NAME,
            u.STATUS,
            u.CREATED_AT,
            u.LAST_LOGIN,
            u.AVATAR_URL,
            'app_user' as USER_TYPE,
            COALESCE(a.COMPANY, '') as COMPANY,
            COALESCE(a.POSITION, '') as POSITION,
            CASE 
              WHEN uca.user_id IS NOT NULL THEN 'conference'
              ELSE 'non_conference'
            END as CATEGORY,
            c.NAME as CONFERENCE_NAME
          FROM APP_USERS u
          LEFT JOIN (
            SELECT DISTINCT EMAIL, COMPANY, POSITION 
            FROM ATTENDEES 
            WHERE EMAIL IS NOT NULL
          ) a ON u.EMAIL = a.EMAIL
          LEFT JOIN user_conference_assignments uca ON u.ID = uca.user_id AND uca.is_active = 1
          LEFT JOIN conferences c ON uca.conference_id = c.ID
          WHERE u.STATUS = 'active'
            AND u.ID IN (
              SELECT ur.user_id 
              FROM user_roles ur 
              JOIN roles r ON ur.role_id = r.ID 
              WHERE r.CODE = 'attendee'
            )
          
          UNION
          
          SELECT 
            u.ID,
            u.EMAIL,
            u.NAME,
            u.STATUS,
            u.CREATED_AT,
            u.LAST_LOGIN,
            u.AVATAR_URL,
            'app_user' as USER_TYPE,
            COALESCE(a.COMPANY, '') as COMPANY,
            COALESCE(a.POSITION, '') as POSITION,
            CASE 
              WHEN uca.user_id IS NOT NULL THEN 'conference'
              ELSE 'system'
            END as CATEGORY,
            c.NAME as CONFERENCE_NAME
          FROM APP_USERS u
          LEFT JOIN (
            SELECT DISTINCT EMAIL, COMPANY, POSITION 
            FROM ATTENDEES 
            WHERE EMAIL IS NOT NULL
          ) a ON u.EMAIL = a.EMAIL
          LEFT JOIN user_conference_assignments uca ON u.ID = uca.user_id AND uca.is_active = 1
          LEFT JOIN conferences c ON uca.conference_id = c.ID
          WHERE u.STATUS = 'active'
            AND u.ID IN (
              SELECT ur.user_id 
              FROM user_roles ur 
              JOIN roles r ON ur.role_id = r.ID 
              WHERE r.CODE IN ('admin', 'staff')
            )
          
          UNION
          
          SELECT 
            a.ID,
            a.EMAIL,
            a.NAME,
            'active' as STATUS,
            a.CREATED_AT,
            NULL as LAST_LOGIN,
            a.AVATAR_URL,
            'attendee' as USER_TYPE,
            COALESCE(a.COMPANY, '') as COMPANY,
            COALESCE(a.POSITION, '') as POSITION,
            CASE 
              WHEN uca.user_id IS NOT NULL THEN 'conference'
              ELSE 'non_conference'
            END as CATEGORY,
            c.NAME as CONFERENCE_NAME
          FROM ATTENDEES a
          LEFT JOIN user_conference_assignments uca ON a.ID = uca.user_id AND uca.is_active = 1
          LEFT JOIN conferences c ON uca.conference_id = c.ID
          WHERE a.EMAIL IS NOT NULL 
            AND a.EMAIL NOT IN (SELECT EMAIL FROM APP_USERS WHERE STATUS = 'active' AND EMAIL IS NOT NULL)
        `;

        let binds: any = {};

        // Exclude current user if provided
        if (
          current_user_id !== undefined &&
          current_user_id !== null &&
          !isNaN(Number(current_user_id))
        ) {
          const validUserId = Number(current_user_id);
          query = `
            SELECT * FROM (
              ${query}
            ) WHERE ID != :current_user_id
          `;
          binds.current_user_id = validUserId;
        }

        query += ' ORDER BY CATEGORY, NAME';

        console.log('Executing getUsersByConferenceCategory query:', query);
        console.log('With binds:', binds);

        const result = await conn.execute(query, binds, { outFormat: oracledb.OUT_FORMAT_OBJECT });
        const rows = (result.rows as any[]) || [];

        console.log('Query result rows count:', rows.length);

        // Remove duplicates based on email (keep app_user over attendee if both exist)
        const uniqueUsers = new Map();
        rows.forEach(row => {
          const email = row.EMAIL;
          if (email && !uniqueUsers.has(email)) {
            uniqueUsers.set(email, row);
          } else if (email && uniqueUsers.has(email)) {
            // If both app_user and attendee exist, keep app_user
            const existing = uniqueUsers.get(email);
            if (existing.USER_TYPE === 'attendee' && row.USER_TYPE === 'app_user') {
              uniqueUsers.set(email, row);
            }
          }
        });

        const deduplicatedRows = Array.from(uniqueUsers.values());
        console.log('Query result rows count after deduplication:', deduplicatedRows.length);

        // Add role information
        const usersWithRoles = await Promise.all(
          deduplicatedRows.map(async user => {
            try {
              const roleQuery = `
                SELECT r.CODE, r.NAME
                FROM user_roles ur
                JOIN roles r ON ur.role_id = r.ID
                WHERE ur.user_id = :user_id
              `;
              const roleResult = await conn.execute(
                roleQuery,
                { userId: user.ID },
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
              );
              const roleRow = (roleResult.rows as any[])?.[0];

              return {
                ...user,
                role: roleRow?.CODE || 'attendee',
                roleName: roleRow?.NAME || 'Attendee',
              };
            } catch (roleError) {
              console.warn(`Could not fetch role for user ${user.ID}:`, roleError);
              return {
                ...user,
                role: 'attendee',
                roleName: 'Attendee',
              };
            }
          })
        );

        return usersWithRoles;
      } catch (error) {
        console.error('Error in getUsersByConferenceCategory:', error);
        throw error;
      }
    });
  },

  // Get conference users with conference information
  async getConferenceUsersWithDetails(conferenceId?: number, current_user_id?: number) {
    return withConn(async conn => {
      try {
        console.log('getConferenceUsersWithDetails called with:', {
          conferenceId,
          current_user_id,
        });

        // Get only conference users with their conference details
        let query = `
          SELECT 
            u.ID,
            u.EMAIL,
            u.NAME,
            u.STATUS,
            u.CREATED_AT,
            u.LAST_LOGIN,
            u.AVATAR_URL,
            'app_user' as USER_TYPE,
            COALESCE(a.COMPANY, '') as COMPANY,
            COALESCE(a.POSITION, '') as POSITION,
            c.ID as CONFERENCE_ID,
            c.NAME as CONFERENCE_NAME,
            c.START_DATE as CONFERENCE_START_DATE,
            c.END_DATE as CONFERENCE_END_DATE,
            uca.ASSIGNED_AT as CONFERENCE_ASSIGNED_AT
          FROM APP_USERS u
          LEFT JOIN (
            SELECT DISTINCT EMAIL, COMPANY, POSITION 
            FROM ATTENDEES 
            WHERE EMAIL IS NOT NULL
          ) a ON u.EMAIL = a.EMAIL
          INNER JOIN user_conference_assignments uca ON u.ID = uca.user_id AND uca.is_active = 1
          INNER JOIN conferences c ON uca.conference_id = c.ID
          WHERE u.STATUS = 'active'
          
          UNION
          
          SELECT 
            a.ID,
            a.EMAIL,
            a.NAME,
            'active' as STATUS,
            a.CREATED_AT,
            NULL as LAST_LOGIN,
            a.AVATAR_URL,
            'attendee' as USER_TYPE,
            COALESCE(a.COMPANY, '') as COMPANY,
            COALESCE(a.POSITION, '') as POSITION,
            c.ID as CONFERENCE_ID,
            c.NAME as CONFERENCE_NAME,
            c.START_DATE as CONFERENCE_START_DATE,
            c.END_DATE as CONFERENCE_END_DATE,
            uca.ASSIGNED_AT as CONFERENCE_ASSIGNED_AT
          FROM ATTENDEES a
          INNER JOIN user_conference_assignments uca ON a.ID = uca.user_id AND uca.is_active = 1
          INNER JOIN conferences c ON uca.conference_id = c.ID
          WHERE a.EMAIL IS NOT NULL 
            AND a.EMAIL NOT IN (SELECT EMAIL FROM APP_USERS WHERE STATUS = 'active' AND EMAIL IS NOT NULL)
        `;

        let binds: any = {};

        // Filter by specific conference if provided
        if (conferenceId !== undefined && conferenceId !== null && !isNaN(Number(conferenceId))) {
          query += ' AND c.ID = :conferenceId';
          binds.conferenceId = Number(conferenceId);
        }

        // Exclude current user if provided
        if (
          current_user_id !== undefined &&
          current_user_id !== null &&
          !isNaN(Number(current_user_id))
        ) {
          const validUserId = Number(current_user_id);
          query = `
            SELECT * FROM (
              ${query}
            ) WHERE ID != :current_user_id
          `;
          binds.current_user_id = validUserId;
        }

        query += ' ORDER BY CONFERENCE_NAME, NAME';

        console.log('Executing getConferenceUsersWithDetails query:', query);
        console.log('With binds:', binds);

        const result = await conn.execute(query, binds, { outFormat: oracledb.OUT_FORMAT_OBJECT });
        const rows = (result.rows as any[]) || [];

        console.log('Query result rows count:', rows.length);

        // Remove duplicates based on email (keep app_user over attendee if both exist)
        const uniqueUsers = new Map();
        rows.forEach(row => {
          const email = row.EMAIL;
          if (email && !uniqueUsers.has(email)) {
            uniqueUsers.set(email, row);
          } else if (email && uniqueUsers.has(email)) {
            // If both app_user and attendee exist, keep app_user
            const existing = uniqueUsers.get(email);
            if (existing.USER_TYPE === 'attendee' && row.USER_TYPE === 'app_user') {
              uniqueUsers.set(email, row);
            }
          }
        });

        const deduplicatedRows = Array.from(uniqueUsers.values());
        console.log('Query result rows count after deduplication:', deduplicatedRows.length);

        // Add role information
        const usersWithRoles = await Promise.all(
          deduplicatedRows.map(async user => {
            try {
              const roleQuery = `
                SELECT r.CODE, r.NAME
                FROM user_roles ur
                JOIN roles r ON ur.role_id = r.ID
                WHERE ur.user_id = :user_id
              `;
              const roleResult = await conn.execute(
                roleQuery,
                { userId: user.ID },
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
              );
              const roleRow = (roleResult.rows as any[])?.[0];

              return {
                ...user,
                role: roleRow?.CODE || 'attendee',
                roleName: roleRow?.NAME || 'Attendee',
              };
            } catch (roleError) {
              console.warn(`Could not fetch role for user ${user.ID}:`, roleError);
              return {
                ...user,
                role: 'attendee',
                roleName: 'Attendee',
              };
            }
          })
        );

        return usersWithRoles;
      } catch (error) {
        console.error('Error in getConferenceUsersWithDetails:', error);
        throw error;
      }
    });
  },

  async addUserToMessaging(userId: number, addedBy?: number, conferenceId?: number) {
    return withConn(async conn => {
      try {
        console.log('Adding user to messaging system:', userId);

        // Determine user type and verify user exists
        let userType = 'app_user';
        let userData = null;

        // Check if it's an app user
        const userCheck = await conn.execute(
          `SELECT ID, EMAIL, NAME FROM APP_USERS WHERE ID = :user_id AND STATUS = 'active'`,
          { userId },
          { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        if (userCheck.rows && userCheck.rows.length > 0) {
          userData = userCheck.rows[0];
          userType = 'app_user';
        } else {
          // Check if it's an attendee
          const attendeeCheck = await conn.execute(
            `SELECT ID, EMAIL, NAME FROM ATTENDEES WHERE ID = :user_id`,
            { userId },
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
          );

          if (attendeeCheck.rows && attendeeCheck.rows.length > 0) {
            userData = attendeeCheck.rows[0];
            userType = 'attendee';
          } else {
            throw new Error(`User with ID ${userId} not found`);
          }
        }

        // Try to use MESSAGING_USERS table if it exists
        try {
          // Check if user is already in messaging system
          const existingCheck = await conn.execute(
            `SELECT ID FROM MESSAGING_USERS WHERE USER_ID = :user_id AND IS_ACTIVE = 1`,
            { userId },
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
          );

          if (existingCheck.rows && existingCheck.rows.length > 0) {
            console.log('User already in messaging system');
            return { userId, added: false, message: 'User already in messaging system' };
          }

          // Insert user into MESSAGING_USERS table
          const insertResult = await conn.execute(
            `INSERT INTO MESSAGING_USERS (USER_ID, USER_TYPE, CONFERENCE_ID, ADDED_BY, IS_ACTIVE, MESSAGE_COUNT, LAST_MESSAGE_TIME)
             VALUES (:user_id, :userType, :conferenceId, :addedBy, 1, 0, NULL)
             RETURNING ID INTO :newId`,
            {
              userId,
              userType,
              conferenceId: conferenceId || 1,
              addedBy: addedBy || 1, // Default to admin user
              newId: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
            },
            { autoCommit: true }
          );

          const newId = insertResult.outBinds?.newId;
          console.log('User added to messaging system with ID:', newId);

          return {
            id: newId,
            userId,
            userType,
            added: true,
            timestamp: new Date().toISOString(),
          };
        } catch (tableError) {
          console.log('MESSAGING_USERS table does not exist, using fallback method');

          // Fallback: Use a simple approach by creating a system message
          // This will make the user appear in the messaging list
          try {
            // First check if user already has a system message
            const existingMessageCheck = await conn.execute(
              `SELECT ID FROM MESSAGES 
               WHERE SESSION_ID = 1 
               AND ATTENDEE_ID = :attendeeId 
               AND CONTENT = 'User added to messaging system'`,
              {
                attendeeId: userType === 'attendee' ? userId : null,
              },
              { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );

            if (existingMessageCheck.rows && existingMessageCheck.rows.length > 0) {
              console.log('User already has system message for messaging');
              return {
                userId,
                added: false,
                message: 'User already in messaging system',
                method: 'system_message',
              };
            }

            // Create a system message to mark user as added to messaging
            const systemMessageResult = await conn.execute(
              `INSERT INTO MESSAGES (SESSION_ID, ATTENDEE_ID, CONTENT, TYPE)
               VALUES (1, :attendeeId, 'User added to messaging system', 'text')
               RETURNING ID INTO :newId`,
              {
                attendeeId: userType === 'attendee' ? userId : null,
                newId: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
              },
              { autoCommit: true }
            );

            console.log('User added to messaging system via system message');
            return {
              userId,
              userType,
              added: true,
              timestamp: new Date().toISOString(),
              method: 'system_message',
            };
          } catch (messageError) {
            console.log('Could not create system message, using memory-only approach');
            // Final fallback: just return success (user will be added to local state only)
            return {
              userId,
              userType,
              added: true,
              timestamp: new Date().toISOString(),
              method: 'memory_only',
            };
          }
        }
      } catch (error) {
        console.error('Error adding user to messaging:', error);
        throw error;
      }
    });
  },

  // Get or create conversation session between two users
  async getOrCreateConversationSession(conferenceId: number, user1Id: number, user2Id: number) {
    return await withConn(async conn => {
      try {
        // First, try to find existing session
        const existingSession = await conn.execute(
          `SELECT ID FROM MESSAGING_SESSIONS 
           WHERE ((USER1_ID = :user1Id AND USER2_ID = :user2Id) 
           OR (USER1_ID = :user2Id AND USER2_ID = :user1Id))
           AND CONFERENCE_ID = :conferenceId 
           AND IS_ACTIVE = 1`,
          { user1Id, user2Id, conferenceId },
          { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        if (existingSession.rows && existingSession.rows.length > 0) {
          return (existingSession.rows[0] as any).ID;
        }

        // Create new session
        const newSession = await conn.execute(
          `INSERT INTO MESSAGING_SESSIONS (USER1_ID, USER2_ID, CONFERENCE_ID, IS_ACTIVE)
           VALUES (:user1Id, :user2Id, :conferenceId, 1)
           RETURNING ID INTO :newId`,
          {
            user1Id,
            user2Id,
            conferenceId,
            newId: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
          },
          { autoCommit: true }
        );

        return (newSession.outBinds as { newId: number[] }).newId[0];
      } catch (error) {
        console.error('Error getting/creating conversation session:', error);
        throw error;
      }
    });
  },

  // Get conversation messages
  async getConversationMessages(sessionId: number, limit: number = 50, offset: number = 0) {
    return await withConn(async conn => {
      try {
        const result = await conn.execute(
          `SELECT 
            m.ID, m.SESSION_ID, m.CONTENT, m.MESSAGE_TYPE, 
            m.ATTENDEE_ID, m.SENDER_ID, m.CREATED_AT, m.IS_READ,
            u1.NAME as SENDER_NAME, u1.EMAIL as SENDER_EMAIL,
            u2.NAME as RECIPIENT_NAME, u2.EMAIL as RECIPIENT_EMAIL
          FROM MESSAGING_MESSAGES m
          LEFT JOIN APP_USERS u1 ON m.SENDER_ID = u1.ID
          LEFT JOIN APP_USERS u2 ON m.ATTENDEE_ID = u2.ID
          WHERE m.SESSION_ID = :sessionId
          ORDER BY m.CREATED_AT DESC
          OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY`,
          { sessionId, limit, offset },
          { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        return result.rows || [];
      } catch (error) {
        console.error('Error getting conversation messages:', error);
        return [];
      }
    });
  },

  // Send message
  async sendMessage(
    sessionId: number,
    content: string,
    messageType: string,
    senderId: number,
    attendeeId?: number
  ) {
    return await withConn(async conn => {
      try {
        const result = await conn.execute(
          `INSERT INTO MESSAGING_MESSAGES (
            SESSION_ID, CONTENT, MESSAGE_TYPE, SENDER_ID, ATTENDEE_ID, 
            CREATED_AT, IS_READ
          ) VALUES (
            :sessionId, :content, :messageType, :senderId, :attendeeId, 
            SYSTIMESTAMP, 0
          ) RETURNING ID INTO :messageId`,
          {
            sessionId,
            content,
            messageType,
            senderId,
            attendeeId: attendeeId || null,
            messageId: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
          },
          { autoCommit: true }
        );

        return (result.outBinds as { messageId: number[] }).messageId[0];
      } catch (error) {
        console.error('Error sending message:', error);
        throw error;
      }
    });
  },

  // Mark message as read
  async markMessageAsRead(messageId: number, userId: number) {
    return await withConn(async conn => {
      try {
        await conn.execute(
          `UPDATE MESSAGING_MESSAGES 
           SET IS_READ = 1, READ_AT = SYSTIMESTAMP
           WHERE ID = :messageId AND ATTENDEE_ID = :user_id`,
          { messageId, userId },
          { autoCommit: true }
        );
        return true;
      } catch (error) {
        console.error('Error marking message as read:', error);
        return false;
      }
    });
  },

  // Get user's conversation sessions
  async getUserConversationSessions(userId: number, conferenceId?: number) {
    return await withConn(async conn => {
      try {
        let query = `
          SELECT 
            ms.ID as SESSION_ID,
            ms.USER1_ID,
            ms.USER2_ID,
            ms.CONFERENCE_ID,
            ms.CREATED_AT as SESSION_CREATED_AT,
            u1.NAME as USER1_NAME,
            u1.EMAIL as USER1_EMAIL,
            u2.NAME as USER2_NAME,
            u2.EMAIL as USER2_EMAIL,
            c.NAME as CONFERENCE_NAME,
            (SELECT COUNT(*) FROM MESSAGING_MESSAGES mm WHERE mm.SESSION_ID = ms.ID) as MESSAGE_COUNT,
            (SELECT MAX(mm.CREATED_AT) FROM MESSAGING_MESSAGES mm WHERE mm.SESSION_ID = ms.ID) as LAST_MESSAGE_AT
          FROM MESSAGING_SESSIONS ms
          LEFT JOIN APP_USERS u1 ON ms.USER1_ID = u1.ID
          LEFT JOIN APP_USERS u2 ON ms.USER2_ID = u2.ID
          LEFT JOIN CONFERENCES c ON ms.CONFERENCE_ID = c.ID
          WHERE (ms.USER1_ID = :user_id OR ms.USER2_ID = :user_id)
          AND ms.IS_ACTIVE = 1
        `;

        const params: any = { userId };

        if (conferenceId) {
          query += ` AND ms.CONFERENCE_ID = :conferenceId`;
          params.conferenceId = conferenceId;
        }

        query += ` ORDER BY LAST_MESSAGE_AT DESC NULLS LAST`;

        const result = await conn.execute(query, params, { outFormat: oracledb.OUT_FORMAT_OBJECT });
        return result.rows || [];
      } catch (error) {
        console.error('Error getting user conversation sessions:', error);
        return [];
      }
    });
  },
};
