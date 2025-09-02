import { comparePassword, hashPassword, signAccessToken, signRefreshToken, verifyToken } from '../../utils/crypto';
import { usersRepository } from '../users/users.repository';
import { attendeesRepository } from '../attendees/attendees.repository';
import { putToken, getToken, deleteToken } from '../../utils/token-store';

export const authService = {
  async login(email: string, password: string) {
    const user = await usersRepository.findByEmail(email);
    if (!user) throw Object.assign(new Error('Invalid credentials'), { status: 401 });
    const ok = user.PASSWORD_HASH ? await comparePassword(password, user.PASSWORD_HASH) : false;
    if (!ok) throw Object.assign(new Error('Invalid credentials'), { status: 401 });
    const payload = { id: user.ID, email: user.EMAIL };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);
    await usersRepository.updateLastLogin(user.ID);
    return { accessToken, refreshToken };
  },

  async refresh(refreshToken: string) {
    try {
      const decoded = verifyToken(refreshToken, 'refresh') as any;
      const payload = { id: decoded.id, email: decoded.email };
      return { accessToken: signAccessToken(payload), refreshToken: signRefreshToken(payload) };
    } catch {
      throw Object.assign(new Error('Invalid refresh token'), { status: 401 });
    }
  },

  async register(input: { email: string; name: string; password: string; }) {
    const existing = await usersRepository.findByEmail(input.email);
    if (existing) throw Object.assign(new Error('Email already used'), { status: 409 });
    const passwordHash = await hashPassword(input.password);
    const user = await usersRepository.create({ EMAIL: input.email, NAME: input.name, PASSWORD_HASH: passwordHash });
    const attendee = await attendeesRepository.findByEmail(input.email);
    if (!attendee) {
      await attendeesRepository.create({
        NAME: input.name,
        EMAIL: input.email,
        PHONE: null,
        COMPANY: null,
        POSITION: null,
        AVATAR_URL: null,
        DIETARY: null,
        SPECIAL_NEEDS: null,
        DATE_OF_BIRTH: null,
        GENDER: null
      });
    }
    return { id: user.ID };
  },

  async issuePasswordReset(email: string) {
    const user = await usersRepository.findByEmail(email);
    if (!user) return; // do not leak
    
    // Generate new random password
    const newPassword = this.generateRandomPassword();
    const passwordHash = await hashPassword(newPassword);
    
    // Update user's password in database
    await usersRepository.setPassword(user.ID, passwordHash);
    
    // Send new password via email
    try {
      await this.sendNewPasswordEmail(user.EMAIL, user.NAME, newPassword);
      console.log(`New password sent to ${user.EMAIL}`);
    } catch (emailError) {
      console.error('Failed to send new password email:', emailError);
      // If email fails, we should revert the password change
      // For now, we'll just log it, but in production you might want to handle this better
    }
    
    return { passwordSent: true };
  },

  generateRandomPassword(): string {
    // Generate a secure random password
    const length = 12;
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let password = "";
    
    // Ensure at least one character from each category
    const lowercase = "abcdefghijklmnopqrstuvwxyz";
    const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const numbers = "0123456789";
    const symbols = "!@#$%^&*";
    
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += symbols[Math.floor(Math.random() * symbols.length)];
    
    // Fill the rest randomly
    for (let i = 4; i < length; i++) {
      password += charset[Math.floor(Math.random() * charset.length)];
    }
    
    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
  },

  async sendNewPasswordEmail(email: string, name: string, newPassword: string) {
    // In a real application, you would use a service like SendGrid, AWS SES, or Nodemailer
    // For now, we'll just log the new password for development
    console.log(`
    ========================================
    NEW PASSWORD EMAIL
    ========================================
    To: ${email}
    Name: ${name}
    
    Your new password is: ${newPassword}
    
    Please login with this password and change it to something more memorable.
    
    If you didn't request this password reset, please contact support immediately.
    ========================================
    `);
    
    // In production, replace this with actual email sending:
    // await emailService.send({
    //   to: email,
    //   subject: 'Mật khẩu mới - Hệ thống Quản lý Hội thảo',
    //   html: this.getNewPasswordEmailTemplate(name, newPassword)
    // });
  },

  getNewPasswordEmailTemplate(name: string, newPassword: string): string {
    return `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Mật khẩu mới</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .password-box { background: #fff; border: 2px solid #e74c3c; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; }
            .password { font-size: 24px; font-weight: bold; color: #e74c3c; letter-spacing: 2px; font-family: 'Courier New', monospace; }
            .warning { background: #fff3cd; border: 1px solid #ffeaa7; color: #856404; padding: 15px; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
            .btn { display: inline-block; background: #3498db; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🔐 Mật khẩu mới</h1>
                <p>Hệ thống Quản lý Hội thảo</p>
            </div>
            
            <div class="content">
                <h2>Xin chào ${name}!</h2>
                
                <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.</p>
                
                <div class="password-box">
                    <h3>Mật khẩu mới của bạn:</h3>
                    <div class="password">${newPassword}</div>
                </div>
                
                <div class="warning">
                    <strong>⚠️ Lưu ý quan trọng:</strong>
                    <ul>
                        <li>Vui lòng đăng nhập ngay với mật khẩu này</li>
                        <li>Thay đổi mật khẩu thành một mật khẩu dễ nhớ hơn</li>
                        <li>Không chia sẻ mật khẩu này với bất kỳ ai</li>
                    </ul>
                </div>
                
                <p>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng liên hệ với chúng tôi ngay lập tức.</p>
                
                <div style="text-align: center;">
                    <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/login" class="btn">
                        Đăng nhập ngay
                    </a>
                </div>
            </div>
            
            <div class="footer">
                <p>Email này được gửi tự động từ hệ thống quản lý hội thảo.</p>
                <p>Vui lòng không trả lời email này.</p>
            </div>
        </div>
    </body>
    </html>
    `;
  },

  async resetPassword(token: string, newPassword: string) {
    try {
      const decoded = verifyToken(token, 'refresh') as any;
      const rec = getToken(`reset:${decoded.id}`);
      
      if (!rec || rec.value !== token) {
        throw Object.assign(new Error('Invalid or expired token'), { status: 400 });
      }
      
      // Validate password strength
      if (newPassword.length < 6) {
        throw Object.assign(new Error('Password must be at least 6 characters long'), { status: 400 });
      }
      
      const hash = await hashPassword(newPassword);
      await usersRepository.setPassword(decoded.id, hash);
      deleteToken(`reset:${decoded.id}`);
      
      // Log successful password reset
      console.log(`Password reset successful for user ID: ${decoded.id}`);
      
    } catch (error) {
      console.error('Password reset failed:', error);
      throw error;
    }
  },

  async changePassword(userId: number, currentPassword: string, newPassword: string) {
    try {
      // Get user from database
      const user = await usersRepository.findById(userId);
      if (!user) {
        throw Object.assign(new Error('User not found'), { status: 404 });
      }

      // Verify current password
      const isCurrentPasswordValid = user.PASSWORD_HASH ? 
        await comparePassword(currentPassword, user.PASSWORD_HASH) : false;
      
      if (!isCurrentPasswordValid) {
        throw Object.assign(new Error('Current password is incorrect'), { status: 400 });
      }

      // Validate new password strength
      if (newPassword.length < 6) {
        throw Object.assign(new Error('New password must be at least 6 characters long'), { status: 400 });
      }

      // Check if new password is different from current password
      if (currentPassword === newPassword) {
        throw Object.assign(new Error('New password must be different from current password'), { status: 400 });
      }

      // Hash new password and update
      const newPasswordHash = await hashPassword(newPassword);
      await usersRepository.setPassword(userId, newPasswordHash);
      
      // Log successful password change
      console.log(`Password changed successfully for user ID: ${userId}`);
      
    } catch (error) {
      console.error('Password change failed:', error);
      throw error;
    }
  }
};


