import { Router } from 'express';
import { GoogleAuthService } from '../services/google-auth.service';

const router = Router();
const googleAuthService = new GoogleAuthService();

/**
 * POST /auth/google/login
 * Đăng nhập với Google - chỉ cho phép user đã tồn tại
 */
router.post('/login', async (req, res) => {
  try {
    const { firebaseUid, email, name, avatar } = req.body;

    // Chỉ cho phép đăng nhập nếu user đã tồn tại
    const result = await googleAuthService.loginExistingUser({
      firebaseUid,
      email,
      name,
      avatar,
    });

    res.json({
      success: true,
      data: result.tokens,
      message: 'Google login successful'
    });
  } catch (error: any) {
    console.error('Google login error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Google login failed'
    });
  }
});

/**
 * POST /auth/google/register
 * Đăng ký với Google - chỉ cho phép user mới
 */
router.post('/register', async (req, res) => {
  try {
    const { firebaseUid, email, name, avatar } = req.body;

    // Chỉ cho phép đăng ký nếu user chưa tồn tại
    const result = await googleAuthService.registerNewUser({
      firebaseUid,
      email,
      name,
      avatar,
    });

    res.json({
      success: true,
      data: result.tokens,
      message: 'Google registration successful'
    });
  } catch (error: any) {
    console.error('Google registration error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Google registration failed'
    });
  }
});

export default router;
