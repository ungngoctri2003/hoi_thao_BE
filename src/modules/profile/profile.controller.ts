import { Request, Response, NextFunction } from 'express'
import oracledb from 'oracledb';
import { withConn } from '../../config/db';
import { ok } from '../../utils/responses';

export async function getProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const email = req.user!.email;
    const data = await withConn(async (conn) => {
      const userRes = await conn.execute(
        `SELECT ID, EMAIL, NAME, STATUS, CREATED_AT, LAST_LOGIN FROM APP_USERS WHERE ID = :id`,
        { id: userId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      const attendeeRes = await conn.execute(
        `SELECT ID, NAME, EMAIL, COMPANY, POSITION, AVATAR_URL, GENDER FROM ATTENDEES WHERE EMAIL = :email`,
        { email },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      return {
        user: ((userRes.rows as any[])[0]) || null,
        attendee: ((attendeeRes.rows as any[])[0]) || null
      };
    });
    res.json(ok(data));
  } catch (e) { next(e); }
}

export async function updateProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const email = req.user!.email;
    const permissions: string[] = req.user!.permissions || [];
    const name: string | undefined = req.body.name;
    const avatar: string | undefined = req.body.avatar;
    
    console.log('🔄 Profile update request:', {
      userId,
      email,
      permissions,
      name,
      avatar: avatar ? avatar.substring(0, 50) + '...' : 'null'
    });
    
    // Determine user role from permissions
    const isAdmin = permissions.includes('roles.admin');
    const isStaff = permissions.includes('conferences.create') || permissions.includes('conferences.update');
    const isAttendee = !isAdmin && !isStaff;
    
    console.log('👤 User role determined:', { isAdmin, isStaff, isAttendee });
    
    const result = await withConn(async (conn) => {
      // Always update APP_USERS table for basic user info
      if (name) {
        console.log('📝 Updating APP_USERS.NAME');
        await conn.execute(`UPDATE APP_USERS SET NAME = :name WHERE ID = :id`, { name, id: userId }, { autoCommit: true });
      }
      
      if (avatar) {
        console.log('📝 Updating APP_USERS.AVATAR_URL');
        await conn.execute(`UPDATE APP_USERS SET AVATAR_URL = :avatar WHERE ID = :id`, { avatar, id: userId }, { autoCommit: true });
      }
      
      // Also update ATTENDEES table if user exists there (for attendee role or hybrid users)
      try {
        const attendeeCheck = await conn.execute(
          `SELECT ID FROM ATTENDEES WHERE EMAIL = :email`,
          { email },
          { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        
        if (attendeeCheck.rows && (attendeeCheck.rows as any[]).length > 0) {
          console.log('📝 User exists in ATTENDEES table, updating there too');
          if (name) {
            await conn.execute(`UPDATE ATTENDEES SET NAME = :name WHERE EMAIL = :email`, { name, email }, { autoCommit: true });
          }
          if (avatar) {
            await conn.execute(`UPDATE ATTENDEES SET AVATAR_URL = :avatar WHERE EMAIL = :email`, { avatar, email }, { autoCommit: true });
          }
        } else {
          console.log('📝 User does not exist in ATTENDEES table, skipping');
        }
      } catch (attendeeError) {
        console.warn('⚠️ Error checking/updating ATTENDEES table:', attendeeError);
      }
      
      // Return updated data from APP_USERS (primary source)
      const userRes = await conn.execute(
        `SELECT ID, EMAIL, NAME, STATUS, CREATED_AT, LAST_LOGIN, AVATAR_URL FROM APP_USERS WHERE ID = :id`,
        { id: userId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      const result = (userRes.rows as any[])[0];
      console.log('📤 Returning APP_USERS data:', result);
      return result;
    });
    res.json(ok(result));
  } catch (e) { next(e); }
}






