import { Router } from 'express';
import { messagingController } from '../modules/messaging/messaging.controller';
import { auth } from '../middlewares/auth';

const router = Router();

// Apply authentication middleware to all routes
router.use(auth());

// Get or create conversation session
router.post('/sessions', messagingController.getOrCreateSession.bind(messagingController));

// Get session messages
router.get(
  '/sessions/:sessionId/messages',
  messagingController.getSessionMessages.bind(messagingController)
);

// Send message
router.post('/messages', messagingController.sendMessage.bind(messagingController));

// Mark message as read
router.put(
  '/messages/:messageId/read',
  messagingController.markMessageAsRead.bind(messagingController)
);

// Get users with messages
router.get(
  '/users-with-messages',
  messagingController.getUsersWithMessages.bind(messagingController)
);

// Add user to messaging
router.post('/users', messagingController.addUserToMessaging.bind(messagingController));

// Get available users
router.get('/available-users', messagingController.getAvailableUsers.bind(messagingController));

export default router;
