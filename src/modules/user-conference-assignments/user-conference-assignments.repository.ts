import { withConn } from '../../config/db';
import oracledb from 'oracledb';

export interface UserConferenceAssignment {
  id: number;
  userId: number;
  conferenceId: number;
  permissions: string; // JSON string
  assignedBy: number;
  assignedAt: Date;
  isActive: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserConferenceAssignmentRequest {
  userId: number;
  conferenceId: number;
  permissions: Record<string, boolean>;
  assignedBy: number;
}

export interface UpdateUserConferenceAssignmentRequest {
  permissions?: Record<string, boolean>;
  isActive?: number;
}

export class UserConferenceAssignmentsRepository {
  async create(data: CreateUserConferenceAssignmentRequest): Promise<number> {
    return withConn(async (conn) => {
      // First check if assignment already exists
      const existingAssignment = await this.findByUserAndConference(data.userId, data.conferenceId);
      
      if (existingAssignment) {
        // If assignment exists and is active, update it
        if (existingAssignment.isActive === 1) {
          await this.update(existingAssignment.id, {
            permissions: data.permissions,
            isActive: 1
          });
          return existingAssignment.id;
        } else {
          // If assignment exists but is inactive, reactivate it
          await this.update(existingAssignment.id, {
            permissions: data.permissions,
            isActive: 1
          });
          return existingAssignment.id;
        }
      }

      // If no existing assignment, create new one
      const query = `
        INSERT INTO user_conference_assignments (user_id, conference_id, permissions, assigned_by, is_active)
        VALUES (:userId, :conferenceId, :permissions, :assignedBy, 1)
        RETURNING id INTO :id
      `;
      
      const permissionsJson = JSON.stringify(data.permissions);
      
      const result = await conn.execute(query, {
        userId: data.userId,
        conferenceId: data.conferenceId,
        permissions: permissionsJson,
        assignedBy: data.assignedBy,
        id: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
      }, { autoCommit: true });

      return result.outBinds.id[0];
    });
  }

  async upsert(data: CreateUserConferenceAssignmentRequest): Promise<number> {
    return withConn(async (conn) => {
      // Use MERGE statement for atomic upsert operation
      const query = `
        MERGE INTO user_conference_assignments uca
        USING (SELECT :userId as user_id, :conferenceId as conference_id FROM dual) src
        ON (uca.user_id = src.user_id AND uca.conference_id = src.conference_id)
        WHEN MATCHED THEN
          UPDATE SET 
            permissions = :permissions,
            assigned_by = :assignedBy,
            is_active = 1,
            updated_at = CURRENT_TIMESTAMP
        WHEN NOT MATCHED THEN
          INSERT (user_id, conference_id, permissions, assigned_by, is_active)
          VALUES (:userId, :conferenceId, :permissions, :assignedBy, 1)
      `;
      
      const permissionsJson = JSON.stringify(data.permissions);
      
      await conn.execute(query, {
        userId: data.userId,
        conferenceId: data.conferenceId,
        permissions: permissionsJson,
        assignedBy: data.assignedBy
      }, { autoCommit: true });

      // Return the ID of the upserted record
      const existingAssignment = await this.findByUserAndConference(data.userId, data.conferenceId);
      return existingAssignment!.id;
    });
  }

  async findByUserAndConference(userId: number, conferenceId: number): Promise<UserConferenceAssignment | null> {
    return withConn(async (conn) => {
      const query = `
        SELECT id, user_id as userId, conference_id as conferenceId, 
               permissions, assigned_by as assignedBy, assigned_at as assignedAt,
               is_active as isActive, created_at as createdAt, updated_at as updatedAt
        FROM user_conference_assignments 
        WHERE user_id = :userId AND conference_id = :conferenceId
      `;
      
      const result = await conn.execute(query, { userId, conferenceId }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
      
      if (result.rows && result.rows.length > 0) {
        const row = result.rows[0] as any;
        
        // Handle CLOB for permissions
        let permissions = '{}';
        if (row.PERMISSIONS) {
          if (typeof row.PERMISSIONS === 'string') {
            permissions = row.PERMISSIONS;
          } else if (row.PERMISSIONS.getData) {
            // It's a LOB object
            permissions = await row.PERMISSIONS.getData();
          }
        }
        
        return {
          id: row.ID,
          userId: row.USERID,
          conferenceId: row.CONFERENCEID,
          permissions: permissions,
          assignedBy: row.ASSIGNEDBY,
          assignedAt: row.ASSIGNEDAT,
          isActive: row.ISACTIVE,
          createdAt: row.CREATEDAT,
          updatedAt: row.UPDATEDAT
        };
      }
      
      return null;
    });
  }

  async findById(id: number): Promise<UserConferenceAssignment | null> {
    return withConn(async (conn) => {
      const query = `
        SELECT id, user_id as userId, conference_id as conferenceId, 
               permissions, assigned_by as assignedBy, assigned_at as assignedAt,
               is_active as isActive, created_at as createdAt, updated_at as updatedAt
        FROM user_conference_assignments 
        WHERE id = :id
      `;
      
      const result = await conn.execute(query, { id }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
      
      if (result.rows && result.rows.length > 0) {
        const row = result.rows[0] as any;
        
        // Handle CLOB for permissions
        let permissions = '{}';
        if (row.PERMISSIONS) {
          if (typeof row.PERMISSIONS === 'string') {
            permissions = row.PERMISSIONS;
          } else if (row.PERMISSIONS.getData) {
            // It's a LOB object
            permissions = await row.PERMISSIONS.getData();
          }
        }
        
        return {
          id: row.ID,
          userId: row.USERID,
          conferenceId: row.CONFERENCEID,
          permissions: permissions,
          assignedBy: row.ASSIGNEDBY,
          assignedAt: row.ASSIGNEDAT,
          isActive: row.ISACTIVE,
          createdAt: row.CREATEDAT,
          updatedAt: row.UPDATEDAT
        };
      }
      
      return null;
    });
  }

  async findByUserId(userId: number): Promise<UserConferenceAssignment[]> {
    return withConn(async (conn) => {
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
          // Handle CLOB for permissions
          let permissions = '{}';
          if (row.PERMISSIONS) {
            if (typeof row.PERMISSIONS === 'string') {
              permissions = row.PERMISSIONS;
            } else if (row.PERMISSIONS.getData) {
              // It's a LOB object
              try {
                permissions = await row.PERMISSIONS.getData();
              } catch (error) {
                console.warn('Error reading LOB data:', error);
                permissions = '{}';
              }
            }
          }
          
          assignments.push({
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
          });
        }
        return assignments;
      }
      
      return [];
    });
  }

  async findByConferenceId(conferenceId: number): Promise<UserConferenceAssignment[]> {
    return withConn(async (conn) => {
      const query = `
        SELECT uca.id, uca.user_id as userId, uca.conference_id as conferenceId, 
               uca.permissions, uca.assigned_by as assignedBy, uca.assigned_at as assignedAt,
               uca.is_active as isActive, uca.created_at as createdAt, uca.updated_at as updatedAt,
               u.name as userName, u.email as userEmail
        FROM user_conference_assignments uca
        JOIN app_users u ON uca.user_id = u.id
        WHERE uca.conference_id = :conferenceId AND uca.is_active = 1
        ORDER BY uca.assigned_at DESC
      `;
      
      const result = await conn.execute(query, { conferenceId }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
      
      if (result.rows && result.rows.length > 0) {
        return result.rows.map((row: any) => ({
          id: row.ID,
          userId: row.USERID,
          conferenceId: row.CONFERENCEID,
          permissions: row.PERMISSIONS,
          assignedBy: row.ASSIGNEDBY,
          assignedAt: row.ASSIGNEDAT,
          isActive: row.ISACTIVE,
          createdAt: row.CREATEDAT,
          updatedAt: row.UPDATEDAT,
          userName: row.USERNAME,
          userEmail: row.USEREMAIL
        }));
      }
      
      return [];
    });
  }

  async update(id: number, data: UpdateUserConferenceAssignmentRequest): Promise<void> {
    return withConn(async (conn) => {
      const updateFields = [];
      const params: any = { id };

      if (data.permissions !== undefined) {
        updateFields.push('permissions = :permissions');
        params.permissions = JSON.stringify(data.permissions);
      }

      if (data.isActive !== undefined) {
        updateFields.push('is_active = :isActive');
        params.isActive = data.isActive;
      }

      if (updateFields.length === 0) {
        return;
      }

      updateFields.push('updated_at = CURRENT_TIMESTAMP');

      const query = `
        UPDATE user_conference_assignments 
        SET ${updateFields.join(', ')}
        WHERE id = :id
      `;

      await conn.execute(query, params, { autoCommit: true });
    });
  }

  async delete(id: number): Promise<void> {
    return withConn(async (conn) => {
      const query = 'DELETE FROM user_conference_assignments WHERE id = :id';
      await conn.execute(query, { id }, { autoCommit: true });
    });
  }

  async deactivate(id: number): Promise<void> {
    return withConn(async (conn) => {
      const query = `
        UPDATE user_conference_assignments 
        SET is_active = 0, updated_at = CURRENT_TIMESTAMP
        WHERE id = :id
      `;
      await conn.execute(query, { id }, { autoCommit: true });
    });
  }

  async checkUserConferencePermission(userId: number, conferenceId: number, permission: string): Promise<boolean> {
    return withConn(async (conn) => {
      const query = `
        SELECT permissions
        FROM user_conference_assignments
        WHERE user_id = :userId 
          AND conference_id = :conferenceId 
          AND is_active = 1
      `;
      
      const result = await conn.execute(query, { userId, conferenceId }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
      
      if (result.rows && result.rows.length > 0) {
        const row = result.rows[0] as any;
        const permissions = JSON.parse(row.PERMISSIONS || '{}');
        return permissions[permission] === true;
      }
      
      return false;
    });
  }

  async getUserConferencePermissions(userId: number): Promise<Record<number, Record<string, boolean>>> {
    return withConn(async (conn) => {
      const query = `
        SELECT conference_id, permissions
        FROM user_conference_assignments
        WHERE user_id = :userId AND is_active = 1
      `;
      
      const result = await conn.execute(query, { userId }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
      const permissions: Record<number, Record<string, boolean>> = {};
      
      if (result.rows && result.rows.length > 0) {
        result.rows.forEach((row: any) => {
          const conferenceId = row.CONFERENCE_ID;
          const conferencePermissions = JSON.parse(row.PERMISSIONS || '{}');
          permissions[conferenceId] = conferencePermissions;
        });
      }
      
      return permissions;
    });
  }

  async listAll(params?: {
    page?: number;
    limit?: number;
    userId?: number;
    conferenceId?: number;
    isActive?: number;
  }): Promise<{ data: UserConferenceAssignment[]; total: number }> {
    return withConn(async (conn) => {
      let whereClause = 'WHERE 1=1';
      const queryParams: any = {};

      if (params?.userId) {
        whereClause += ' AND uca.user_id = :userId';
        queryParams.userId = params.userId;
      }

      if (params?.conferenceId) {
        whereClause += ' AND uca.conference_id = :conferenceId';
        queryParams.conferenceId = params.conferenceId;
      }

      if (params?.isActive !== undefined) {
        whereClause += ' AND uca.is_active = :isActive';
        queryParams.isActive = params.isActive;
      }

      // Count total records
      const countQuery = `
        SELECT COUNT(*) as total
        FROM user_conference_assignments uca
        ${whereClause}
      `;
      
      const countResult = await conn.execute(countQuery, queryParams, { outFormat: oracledb.OUT_FORMAT_OBJECT });
      const total = countResult.rows?.[0]?.TOTAL || 0;

      // Get paginated data
      const offset = ((params?.page || 1) - 1) * (params?.limit || 50);
      const limit = params?.limit || 50;

      const dataQuery = `
        SELECT uca.id, uca.user_id as userId, uca.conference_id as conferenceId, 
               uca.permissions, uca.assigned_by as assignedBy, uca.assigned_at as assignedAt,
               uca.is_active as isActive, uca.created_at as createdAt, uca.updated_at as updatedAt,
               u.name as userName, u.email as userEmail, c.name as conferenceName
        FROM user_conference_assignments uca
        JOIN app_users u ON uca.user_id = u.id
        JOIN conferences c ON uca.conference_id = c.ID
        ${whereClause}
        ORDER BY uca.assigned_at DESC
        OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY
      `;

      const dataResult = await conn.execute(dataQuery, { ...queryParams, offset, limit }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
      
      const data = [];
      if (dataResult.rows) {
        for (const row of dataResult.rows) {
          // Handle CLOB for permissions
          let permissions = {};
          
          if (row.PERMISSIONS) {
            if (typeof row.PERMISSIONS === 'string') {
              try {
                permissions = JSON.parse(row.PERMISSIONS);
              } catch (error) {
                console.warn('Error parsing permissions JSON:', error);
                permissions = {};
              }
            } else if (row.PERMISSIONS.getData) {
              // It's a LOB object
              try {
                const lobData = await row.PERMISSIONS.getData();
                permissions = JSON.parse(lobData);
              } catch (error) {
                console.warn('Error reading LOB permissions data:', error);
                permissions = {};
              }
            } else {
              // Fallback for other types
              permissions = {};
            }
          }

          data.push({
            ID: row.ID,
            USER_ID: row.USERID,
            CONFERENCE_ID: row.CONFERENCEID,
            PERMISSIONS: permissions,
            ASSIGNED_BY: row.ASSIGNEDBY,
            ASSIGNED_AT: row.ASSIGNEDAT,
            IS_ACTIVE: row.ISACTIVE,
            CREATED_AT: row.CREATEDAT,
            UPDATED_AT: row.UPDATEDAT,
            USER_NAME: row.USERNAME,
            USER_EMAIL: row.USEREMAIL,
            CONFERENCE_NAME: row.CONFERENCENAME
          });
        }
      }

      return { data, total };
    });
  }
}

export const userConferenceAssignmentsRepository = new UserConferenceAssignmentsRepository();
