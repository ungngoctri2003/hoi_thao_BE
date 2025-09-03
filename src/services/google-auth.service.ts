import { firebaseAdmin } from '../config/firebase-admin';
import { usersRepository } from '../modules/users/users.repository';
import { attendeesRepository } from '../modules/attendees/attendees.repository';
import { signAccessToken, signRefreshToken } from '../utils/crypto';

export class GoogleAuthService {
  /**
   * Xác thực Firebase ID token
   */
  async verifyIdToken(idToken: string) {
    try {
      if (!firebaseAdmin) {
        throw new Error('Firebase Admin SDK not initialized');
      }
      const decodedToken = await firebaseAdmin.auth().verifyIdToken(idToken);
      return decodedToken;
    } catch (error) {
      throw new Error('Invalid Firebase token');
    }
  }

  /**
   * Đăng nhập user đã tồn tại với Google
   */
  async loginExistingUser(googleData: {
    firebaseUid: string;
    email: string;
    name: string;
    avatar?: string;
  }) {
    console.log('Logging in existing user:', googleData);
    
    try {
      // 1. Kiểm tra user đã tồn tại chưa bằng firebaseUid hoặc email
      let user = await this.findUserByFirebaseUid(googleData.firebaseUid);
      
      if (!user) {
        // Nếu không tìm thấy bằng firebaseUid, thử tìm bằng email
        const { usersRepository } = await import('../modules/users/users.repository');
        user = await usersRepository.findByEmail(googleData.email);
      }
      
      if (!user) {
        throw new Error('Tài khoản chưa được đăng ký. Vui lòng đăng ký trước khi đăng nhập.');
      }
      
      // 2. Cập nhật thông tin user nếu cần
      console.log('User exists, updating...');
      const { usersRepository } = await import('../modules/users/users.repository');
      await usersRepository.update(user.ID, {
        EMAIL: googleData.email,
        NAME: googleData.name,
        AVATAR_URL: googleData.avatar,
        FIREBASE_UID: googleData.firebaseUid
      });
      
      // Cập nhật attendee nếu có
      const { attendeesRepository } = await import('../modules/attendees/attendees.repository');
      const attendee = await attendeesRepository.findByEmail(googleData.email);
      if (attendee) {
        await attendeesRepository.update(attendee.ID, {
          NAME: googleData.name,
                  AVATAR_URL: googleData.avatar || undefined,
        FIREBASE_UID: googleData.firebaseUid || undefined
        });
      }
      
      user = await usersRepository.findById(user.ID);
      
      if (!user) {
        throw new Error('Failed to update user');
      }
      
      // Tạo JWT tokens
      const payload = { id: user.ID, email: user.EMAIL };
      const { signAccessToken, signRefreshToken } = await import('../utils/crypto');
      const accessToken = signAccessToken(payload);
      const refreshToken = signRefreshToken(payload);
      
      // Cập nhật last login
      await usersRepository.updateLastLogin(user.ID);
      
      return {
        user: {
          id: user.ID,
          email: user.EMAIL,
          name: user.NAME,
          firebaseUid: googleData.firebaseUid,
          avatar: user.AVATAR_URL || googleData.avatar,
          role: 'attendee', // Default role
          createdAt: new Date(),
          updatedAt: new Date()
        },
        tokens: {
          accessToken,
          refreshToken
        }
      };
    } catch (error) {
      console.error('Error in loginExistingUser:', error);
      throw error;
    }
  }

  /**
   * Đăng ký user mới với Google
   */
  async registerNewUser(googleData: {
    firebaseUid: string;
    email: string;
    name: string;
    avatar?: string;
  }) {
    console.log('Registering new user:', googleData);
    
    try {
      // 1. Kiểm tra user đã tồn tại chưa
      let user = await this.findUserByFirebaseUid(googleData.firebaseUid);
      
      if (!user) {
        // Nếu không tìm thấy bằng firebaseUid, thử tìm bằng email
        const { usersRepository } = await import('../modules/users/users.repository');
        user = await usersRepository.findByEmail(googleData.email);
      }
      
      if (user) {
        throw new Error('Tài khoản đã tồn tại. Vui lòng đăng nhập thay vì đăng ký.');
      }
      
      // 2. Tạo user mới
      console.log('User not found, creating new user...');
      const { usersRepository } = await import('../modules/users/users.repository');
      
      user = await usersRepository.create({
        EMAIL: googleData.email,
        NAME: googleData.name,
        PASSWORD_HASH: null, // Google auth không cần password
        FIREBASE_UID: googleData.firebaseUid || null,
        AVATAR_URL: googleData.avatar || null
      });
      
      // Tạo attendee record
      const { attendeesRepository } = await import('../modules/attendees/attendees.repository');
      await attendeesRepository.create({
        NAME: googleData.name,
        EMAIL: googleData.email,
        PHONE: null,
        COMPANY: null,
        POSITION: null,
        AVATAR_URL: googleData.avatar || null,
        DIETARY: null,
        SPECIAL_NEEDS: null,
        DATE_OF_BIRTH: null,
        GENDER: null,
        FIREBASE_UID: googleData.firebaseUid || null
      });
      
      if (!user) {
        throw new Error('Failed to create user');
      }
      
      // Tạo JWT tokens
      const payload = { id: user.ID, email: user.EMAIL };
      const { signAccessToken, signRefreshToken } = await import('../utils/crypto');
      const accessToken = signAccessToken(payload);
      const refreshToken = signRefreshToken(payload);
      
      // Cập nhật last login
      await usersRepository.updateLastLogin(user.ID);
      
      return {
        user: {
          id: user.ID,
          email: user.EMAIL,
          name: user.NAME,
          firebaseUid: googleData.firebaseUid,
          avatar: user.AVATAR_URL || googleData.avatar,
          role: 'attendee', // Default role
          createdAt: new Date(),
          updatedAt: new Date()
        },
        tokens: {
          accessToken,
          refreshToken
        }
      };
    } catch (error) {
      console.error('Error in registerNewUser:', error);
      throw error;
    }
  }

  /**
   * Tạo hoặc cập nhật user từ Google data (legacy method - kept for backward compatibility)
   */
  async createOrUpdateUser(googleData: {
    firebaseUid: string;
    email: string;
    name: string;
    avatar?: string;
  }) {
    console.log('Creating/updating user:', googleData);
    
    try {
      // 1. Kiểm tra user đã tồn tại chưa bằng firebaseUid
      let user = await this.findUserByFirebaseUid(googleData.firebaseUid);
      
      if (user) {
        // 2. Nếu có, cập nhật thông tin
        console.log('User exists, updating...');
        await usersRepository.update(user.ID, {
          EMAIL: googleData.email,
          NAME: googleData.name,
          AVATAR_URL: googleData.avatar
        });
        
        // Cập nhật attendee nếu có
        const attendee = await attendeesRepository.findByEmail(googleData.email);
        if (attendee) {
          await attendeesRepository.update(attendee.ID, {
            NAME: googleData.name,
                    AVATAR_URL: googleData.avatar || undefined,
        FIREBASE_UID: googleData.firebaseUid || undefined
          });
        }
        
        user = await usersRepository.findById(user.ID);
      } else {
        // 3. Nếu chưa, tạo user mới
        console.log('User not found, creating new user...');
        
        // Kiểm tra email đã tồn tại chưa
        const existingUser = await usersRepository.findByEmail(googleData.email);
        if (existingUser) {
          // Nếu email đã tồn tại, cập nhật firebase_uid
          await usersRepository.update(existingUser.ID, {
                    AVATAR_URL: googleData.avatar || undefined,
        FIREBASE_UID: googleData.firebaseUid || undefined
          });
          user = await usersRepository.findById(existingUser.ID);
        } else {
          // Tạo user mới
          user = await usersRepository.create({
            EMAIL: googleData.email,
            NAME: googleData.name,
            PASSWORD_HASH: null, // Google auth không cần password
            FIREBASE_UID: googleData.firebaseUid || null,
            AVATAR_URL: googleData.avatar || null
          });
        }
        
        // Tạo attendee record nếu chưa có
        const attendee = await attendeesRepository.findByEmail(googleData.email);
        if (!attendee) {
          await attendeesRepository.create({
            NAME: googleData.name,
            EMAIL: googleData.email,
            PHONE: null,
            COMPANY: null,
            POSITION: null,
            AVATAR_URL: googleData.avatar || null,
            DIETARY: null,
            SPECIAL_NEEDS: null,
            DATE_OF_BIRTH: null,
            GENDER: null,
            FIREBASE_UID: googleData.firebaseUid || null
          });
        } else {
          // Cập nhật attendee với firebase_uid
          await attendeesRepository.update(attendee.ID, {
            FIREBASE_UID: googleData.firebaseUid || null,
            AVATAR_URL: googleData.avatar || null
          });
        }
      }
      
      if (!user) {
        throw new Error('Failed to create or update user');
      }
      
      // Tạo JWT tokens
      const payload = { id: user.ID, email: user.EMAIL };
      const accessToken = signAccessToken(payload);
      const refreshToken = signRefreshToken(payload);
      
      // Cập nhật last login
      await usersRepository.updateLastLogin(user.ID);
      
      return {
        user: {
          id: user.ID,
          email: user.EMAIL,
          name: user.NAME,
          firebaseUid: googleData.firebaseUid,
          avatar: user.AVATAR_URL || googleData.avatar,
          role: 'attendee', // Default role
          createdAt: new Date(),
          updatedAt: new Date()
        },
        tokens: {
          accessToken,
          refreshToken
        }
      };
    } catch (error) {
      console.error('Error in createOrUpdateUser:', error);
      throw error;
    }
  }

  /**
   * Tìm user bằng firebase_uid
   */
  private async findUserByFirebaseUid(firebaseUid: string) {
    try {
      // Sử dụng raw query để tìm user bằng firebase_uid
      const { withConn } = await import('../config/db');
      const oracledb = await import('oracledb');
      
      return await withConn(async (conn) => {
        const res = await conn.execute(
          `SELECT ID, EMAIL, NAME, PASSWORD_HASH, AVATAR_URL, FIREBASE_UID FROM APP_USERS WHERE FIREBASE_UID = :firebaseUid`,
          { firebaseUid },
          { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        const rows = (res.rows as any[]) || [];
        return rows[0] || null;
      });
    } catch (error) {
      console.error('Error finding user by firebase_uid:', error);
      return null;
    }
  }
}
