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

// Public conferences for check-in (includes both published and active)
publicRouter.get(
  '/conferences/checkin',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { page, limit } = parsePagination(req.query);
      const { rows, total } = await conferencesRepository.listForAttendees(page, limit);
      res.json(ok(rows, meta(page, limit, total)));
    } catch (e) {
      next(e);
    }
  }
);

// Public conference detail by ID
publicRouter.get('/conferences/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const conference = await conferencesRepository.findById(Number(id));

    if (!conference) {
      res.status(404).json({
        error: {
          code: 'CONFERENCE_NOT_FOUND',
          message: 'Conference not found',
        },
      });
      return;
    }

    res.json(ok(conference));
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
      attendeeId: req.query.attendeeId ? Number(req.query.attendeeId) : undefined,
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
          message: 'Query parameter "q" and "conferenceId" are required',
        },
      });
      return;
    }

    const attendees = await attendeesRepository.searchByQuery(q as string, Number(conferenceId));

    res.json(ok(attendees));
  } catch (e) {
    next(e);
  }
});

publicRouter.post(
  '/checkins/validate-qr',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { qrCode, conferenceId } = req.body;

      if (!qrCode || !conferenceId) {
        res.status(400).json({
          error: {
            code: 'MISSING_PARAMETERS',
            message: 'qrCode and conferenceId are required',
          },
        });
        return;
      }

      // Find attendee by QR code and conference
      const attendee = await attendeesRepository.findByQRCodeAndConference(
        qrCode,
        Number(conferenceId)
      );

      if (!attendee) {
        res.json(ok({ valid: false, attendee: null }));
        return;
      }

      res.json(ok({ valid: true, attendee }));
    } catch (e) {
      next(e);
    }
  }
);

publicRouter.post('/checkins/checkin', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { attendeeId, qrCode, conferenceId, checkInMethod, attendeeInfo, sessionId } = req.body;

    if (!conferenceId) {
      res.status(400).json({
        error: {
          code: 'MISSING_PARAMETERS',
          message: 'conferenceId is required',
        },
      });
      return;
    }

    let result;

    if (checkInMethod === 'qr' && qrCode) {
      // QR code check-in
      try {
        result = await checkinsRepository.scanByQr(qrCode, sessionId ? Number(sessionId) : null);
        } catch (error: any) {
          // If registration not found, try to create one from QR data
          if (error.message === 'Registration not found') {
          console.log('Registration not found, attempting to create from QR data:', qrCode);
          
          // Parse QR code to extract attendee and conference info
          let qrData;
          try {
            qrData = JSON.parse(qrCode);
          } catch (parseError) {
            throw new Error('Invalid QR code format');
          }
          
          if (!qrData.id || !qrData.conf) {
            throw new Error('QR code missing required fields (id, conf)');
          }
          
          // Create attendee if not exists
          let attendee = await attendeesRepository.findById(qrData.id);
          if (!attendee) {
            console.log('Creating attendee from QR data:', qrData);
            attendee = await attendeesRepository.create({
              NAME: qrData.a?.name || `Attendee ${qrData.id}`,
              EMAIL: qrData.a?.email || `attendee${qrData.id}@example.com`,
              PHONE: qrData.a?.phone || '0123456789',
              COMPANY: null,
              POSITION: null,
              AVATAR_URL: null,
              DIETARY: null,
              SPECIAL_NEEDS: null,
              DATE_OF_BIRTH: null,
              GENDER: null,
              FIREBASE_UID: null,
            });
          }
          
          // Check if registration already exists
          const existingRegistrations = await registrationsRepository.list({
            attendeeId: attendee.ID,
            conferenceId: qrData.conf,
            page: 1,
            limit: 1
          });
          
          let registration;
          if (existingRegistrations.rows && existingRegistrations.rows.length > 0) {
            // Use existing registration
            registration = existingRegistrations.rows[0];
            console.log('Using existing registration:', registration?.ID, 'QR_CODE:', registration?.QR_CODE);
          } else {
            // Create new registration
            console.log('Creating registration for attendee:', attendee.ID, 'conference:', qrData.conf);
            registration = await registrationsRepository.create({
              ATTENDEE_ID: attendee.ID,
              CONFERENCE_ID: qrData.conf,
            });
            
            if (!registration || !registration.ID) {
              throw new Error('Failed to create registration');
            }
            console.log('Created registration:', registration.ID, 'QR_CODE:', registration.QR_CODE);
          }
          
          // Update registration with QR code if it doesn't have one
          if (registration && !registration.QR_CODE) {
            console.log('Updating registration with QR code:', qrCode);
            await registrationsRepository.updateQrCode(registration.ID, qrCode);
            registration.QR_CODE = qrCode; // Update local object
          }
          
          // Use the QR code from the registration (either existing or newly set)
          const qrCodeToUse = registration?.QR_CODE || qrCode;
          console.log('Using QR code for scanByQr:', qrCodeToUse);
          
          // Extract sessionId from QR data if available
          const sessionIdFromQr = qrData.session ? Number(qrData.session) : null;
          
          // Now try scanByQr again with the QR code we stored
          result = await checkinsRepository.scanByQr(qrCodeToUse, sessionId ? Number(sessionId) : sessionIdFromQr);
        } else {
          throw error;
        }
      }
    } else if (checkInMethod === 'manual' && attendeeId) {
      // Manual check-in - need to find registration ID first

      // Find registration for this attendee and conference
      const registrations = await registrationsRepository.list({
        attendeeId: attendeeId,
        conferenceId: Number(conferenceId),
        page: 1,
        limit: 1,
      });

      if (!registrations.rows || registrations.rows.length === 0) {
        res.status(404).json({
          error: {
            code: 'REGISTRATION_NOT_FOUND',
            message: 'No registration found for this attendee and conference',
          },
        });
        return;
      }

      const registration = registrations.rows[0];

      if (!registration) {
        res.status(404).json({
          error: {
            code: 'REGISTRATION_NOT_FOUND',
            message: 'No registration found for this attendee and conference',
          },
        });
        return;
      }

      result = await checkinsRepository.manual(registration.ID, sessionId ? Number(sessionId) : null);
    } else if (attendeeInfo) {
      // Create new attendee first
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
        FIREBASE_UID: null,
      });

      if (!newAttendee || !newAttendee.ID) {
        console.error('Failed to create attendee:', newAttendee);
        res.status(500).json({
          error: {
            code: 'ATTENDEE_CREATION_FAILED',
            message: 'Failed to create attendee',
          },
        });
        return;
      }

      // Create registration for the attendee
      const registration = await registrationsRepository.create({
        ATTENDEE_ID: newAttendee.ID,
        CONFERENCE_ID: Number(conferenceId),
      });

      if (!registration || !registration.ID) {
        console.error('Failed to create registration:', registration);
        res.status(500).json({
          error: {
            code: 'REGISTRATION_CREATION_FAILED',
            message: 'Failed to create registration',
          },
        });
        return;
      }

      // Perform manual check-in
      result = await checkinsRepository.manual(registration.ID, sessionId ? Number(sessionId) : null);
    } else {
      res.status(400).json({
        error: {
          code: 'INVALID_REQUEST',
          message: 'Invalid check-in request',
        },
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
          message: 'Check-in ID is required',
        },
      });
      return;
    }

    if (!qrCode) {
      res.status(400).json({
        error: {
          code: 'MISSING_QR_CODE',
          message: 'QR code is required to delete check-in',
        },
      });
      return;
    }

    // Verify QR code matches the check-in record
    const verificationResult = await checkinsRepository.verifyQrForDelete(Number(id), qrCode);

    if (!verificationResult.valid) {
      res.status(403).json({
        error: {
          code: 'INVALID_QR_CODE',
          message: 'QR code does not match this check-in record',
        },
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
