import { Router } from 'express';
import { auth } from '../../middlewares/auth';
import { listForAttendees } from '../../modules/conferences/conferences.controller';
import { getMyRegistrations } from '../../modules/conference-registrations/conference-registrations.controller';

export const attendeeRouter = Router();

// Get upcoming events for attendees (no special permissions required)
attendeeRouter.get('/events/upcoming', auth(), listForAttendees);

// Get my registrations
attendeeRouter.get('/registrations', auth(), getMyRegistrations);

// Get my notifications (placeholder)
attendeeRouter.get('/notifications', auth(), async (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: 1,
        title: 'Chào mừng bạn đến với hệ thống!',
        message: 'Cảm ơn bạn đã tham gia hệ thống quản lý hội nghị.',
        type: 'info',
        read: false,
        timestamp: new Date().toISOString(),
      },
    ],
  });
});

// Get my certificates (placeholder)
attendeeRouter.get('/certificates', auth(), async (req, res) => {
  res.json({
    success: true,
    data: [],
  });
});
