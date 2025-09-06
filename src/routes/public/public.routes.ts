import { Router } from 'express';
import { Request, Response, NextFunction } from 'express';
import { checkinsRepository } from '../../modules/checkins/checkins.repository';
import { conferencesRepository } from '../../modules/conferences/conferences.repository';
import { attendeesRepository } from '../../modules/attendees/attendees.repository';
import { registrationsRepository } from '../../modules/registrations/registrations.repository';
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
    
    console.log('Check-in request:', { attendeeId, qrCode, conferenceId, checkInMethod, attendeeInfo });
    
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
      console.log('Processing QR code check-in');
      result = await checkinsRepository.scanByQr(qrCode);
    } else if (checkInMethod === 'manual' && attendeeId) {
      // Manual check-in - need to find registration ID first
      console.log('Processing manual check-in with attendeeId:', attendeeId);
      
      // Find registration for this attendee and conference
      const registrations = await registrationsRepository.list({
        attendeeId: attendeeId,
        conferenceId: Number(conferenceId),
        page: 1,
        limit: 1
      });
      
      if (!registrations.rows || registrations.rows.length === 0) {
        res.status(404).json({ 
          error: { 
            code: 'REGISTRATION_NOT_FOUND', 
            message: 'No registration found for this attendee and conference' 
          } 
        });
        return;
      }
      
      const registration = registrations.rows[0];
      console.log('Found registration:', registration);
      
      if (!registration) {
        res.status(404).json({ 
          error: { 
            code: 'REGISTRATION_NOT_FOUND', 
            message: 'No registration found for this attendee and conference' 
          } 
        });
        return;
      }
      
      result = await checkinsRepository.manual(registration.ID);
    } else if (attendeeInfo) {
      // Create new attendee first
      console.log('Creating new attendee:', attendeeInfo);
      const newAttendee = await attendeesRepository.create({
        NAME: attendeeInfo.name,
        EMAIL: attendeeInfo.email,
        PHONE: attendeeInfo.phone || null,
        COMPANY: null,
        POSITION: null,
        AVATAR_URL: null,
        DIETARY: null,
        SPECIAL_NEEDS: null,
        DATE_OF_BIRTH: null,
        GENDER: null,
        FIREBASE_UID: null
      });
      
      console.log('Created attendee:', newAttendee);
      
      if (!newAttendee || !newAttendee.ID) {
        console.error('Failed to create attendee:', newAttendee);
        res.status(500).json({ 
          error: { 
            code: 'ATTENDEE_CREATION_FAILED', 
            message: 'Failed to create attendee' 
          } 
        });
        return;
      }
      
      // Create registration for the attendee
      console.log('Creating registration for attendee ID:', newAttendee.ID, 'conference ID:', conferenceId);
      const registration = await registrationsRepository.create({
        ATTENDEE_ID: newAttendee.ID,
        CONFERENCE_ID: Number(conferenceId)
      });
      
      console.log('Created registration:', registration);
      
      if (!registration || !registration.ID) {
        console.error('Failed to create registration:', registration);
        res.status(500).json({ 
          error: { 
            code: 'REGISTRATION_CREATION_FAILED', 
            message: 'Failed to create registration' 
          } 
        });
        return;
      }
      
      // Perform manual check-in
      console.log('Performing manual check-in with registration ID:', registration.ID);
      result = await checkinsRepository.manual(registration.ID);
      console.log('Check-in result:', result);
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
    console.error('Check-in error:', e);
    next(e); 
  }
});

// Delete check-in record
publicRouter.delete('/checkins/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { qrCode } = req.body;
    
    if (!id) {
      res.status(400).json({ 
        error: { 
          code: 'MISSING_PARAMETERS', 
          message: 'Check-in ID is required' 
        } 
      });
      return;
    }

    if (!qrCode) {
      res.status(400).json({ 
        error: { 
          code: 'MISSING_QR_CODE', 
          message: 'QR code is required to delete check-in' 
        } 
      });
      return;
    }

    // Verify QR code matches the check-in record
    const verificationResult = await checkinsRepository.verifyQrForDelete(Number(id), qrCode);
    
    if (!verificationResult.valid) {
      res.status(403).json({ 
        error: { 
          code: 'INVALID_QR_CODE', 
          message: 'QR code does not match this check-in record' 
        } 
      });
      return;
    }

    const result = await checkinsRepository.delete(Number(id));
    res.json(ok(result));
  } catch (e) { 
    console.error('Delete check-in error:', e);
    next(e); 
  }
});