import { Router } from 'express';
import { Request, Response, NextFunction } from 'express';
import { checkinsRepository } from '../../modules/checkins/checkins.repository';
import { conferencesRepository } from '../../modules/conferences/conferences.repository';
import { attendeesRepository } from '../../modules/attendees/attendees.repository';
import { parsePagination, meta } from '../../utils/pagination';
import { ok } from '../../utils/responses';

export const publicRouter = Router();

// Public conferences endpoints
publicRouter.get('/conferences', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit } = parsePagination(req.query);
    const { rows, total } = await conferencesRepository.listByStatus(page, limit, 'active');
    res.json(ok(rows, meta(page, limit, total)));
  } catch (e) { 
    next(e); 
  }
});

// Public checkin endpoints
publicRouter.get('/checkins', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit } = parsePagination(req.query);
    const { rows, total } = await checkinsRepository.list({
      page, 
      limit,
      conferenceId: req.query.conferenceId ? Number(req.query.conferenceId) : undefined,
      attendeeId: req.query.attendeeId ? Number(req.query.attendeeId) : undefined
    });
    res.json(ok(rows, meta(page, limit, total)));
  } catch (e) { 
    next(e); 
  }
});

publicRouter.get('/attendees/search', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { q, conferenceId } = req.query;
    
    if (!q || !conferenceId) {
      res.status(400).json({ 
        error: { 
          code: 'MISSING_PARAMETERS', 
          message: 'Query parameter "q" and "conferenceId" are required' 
        } 
      });
      return;
    }

    const attendees = await attendeesRepository.searchByQuery(
      q as string, 
      Number(conferenceId)
    );
    
    res.json(ok(attendees));
  } catch (e) { 
    next(e); 
  }
});

publicRouter.post('/checkins/validate-qr', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { qrCode, conferenceId } = req.body;
    
    if (!qrCode || !conferenceId) {
      res.status(400).json({ 
        error: { 
          code: 'MISSING_PARAMETERS', 
          message: 'qrCode and conferenceId are required' 
        } 
      });
      return;
    }

    // Find attendee by QR code and conference
    const attendee = await attendeesRepository.findByQRCodeAndConference(qrCode, Number(conferenceId));
    
    if (!attendee) {
      res.json(ok({ valid: false, attendee: null }));
      return;
    }

    res.json(ok({ valid: true, attendee }));
  } catch (e) { 
    next(e); 
  }
});

publicRouter.post('/checkins/checkin', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { attendeeId, qrCode, conferenceId, checkInMethod, attendeeInfo } = req.body;
    
    if (!conferenceId) {
      res.status(400).json({ 
        error: { 
          code: 'MISSING_PARAMETERS', 
          message: 'conferenceId is required' 
        } 
      });
      return;
    }

    let result;
    
    if (checkInMethod === 'qr' && qrCode) {
      // QR code check-in
      result = await checkinsRepository.scanByQr(qrCode);
    } else if (checkInMethod === 'manual' && attendeeId) {
      // Manual check-in
      result = await checkinsRepository.manual(attendeeId);
    } else if (attendeeInfo) {
      // Create new attendee and check-in
      const newAttendee = await attendeesRepository.create({
        ...attendeeInfo,
        conferenceId: Number(conferenceId),
        qrCode: qrCode || `QR_${Date.now()}`
      });
      result = await checkinsRepository.manual(newAttendee.ID);
    } else {
      res.status(400).json({ 
        error: { 
          code: 'INVALID_REQUEST', 
          message: 'Invalid check-in request' 
        } 
      });
      return;
    }

    res.status(201).json(ok(result));
  } catch (e) { 
    next(e); 
  }
});
