import { Request, Response, NextFunction } from 'express';
import { registrationsRepository } from './registrations.repository';
import { attendeesRepository } from '../attendees/attendees.repository';
import { usersRepository } from '../users/users.repository';
import { parsePagination, meta } from '../../utils/pagination';
import { ok } from '../../utils/responses';
import { hashPassword } from '../../utils/crypto';
import { withConn } from '../../config/db';
import { ImageUploadService } from '../../services/image-upload.service';



export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const { page, limit } = parsePagination(req.query);
    const { rows, total } = await registrationsRepository.list({
      page, limit,
      attendeeId: req.query.attendeeId ? Number(req.query.attendeeId) : undefined,
      conferenceId: req.query.conferenceId ? Number(req.query.conferenceId) : undefined,
      status: req.query.status as string | undefined
    });
    res.json(ok(rows, meta(page, limit, total)));
  } catch (e) { next(e); }
}

export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const item = await registrationsRepository.findById(Number(req.params.id));
    if (!item) res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Registration not found' } });
    res.json(ok(item));
  } catch (e) { next(e); }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const item = await registrationsRepository.create({ ATTENDEE_ID: req.body.attendeeId, CONFERENCE_ID: req.body.conferenceId });
    res.status(201).json(ok(item));
  } catch (e) { next(e); }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const item = await registrationsRepository.update(Number(req.params.id), req.body.status);
    res.json(ok(item));
  } catch (e) { next(e); }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await registrationsRepository.remove(Number(req.params.id));
    res.status(204).send();
  } catch (e) { 
    next(e); 
  }
}

export async function publicRegistration(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { 
      email, 
      name, 
      password, 
      phone, 
      company, 
      position, 
      avatarUrl,
      dietary, 
      specialNeeds, 
      dateOfBirth, 
      gender, 
      conferenceId 
    } = req.body;

    // Check if user already exists
    const existingUser = await usersRepository.findByEmail(email);
    if (existingUser) {
      res.status(400).json({ 
        error: { 
          code: 'USER_EXISTS', 
          message: 'User with this email already exists' 
        } 
      });
      return;
    }

    // Step 1: Create user account
    const hashedPassword = await hashPassword(password);
    const user = await usersRepository.create({
      EMAIL: email,
      NAME: name,
      PASSWORD_HASH: hashedPassword
    });

    // Step 2: Create attendee record
    // Handle avatar URL - upload to Cloudinary if it's base64
    let processedAvatarUrl = avatarUrl;
    if (avatarUrl && avatarUrl.startsWith('data:image/')) {
      try {
        // Upload base64 image to Cloudinary
        const uploadResult = await ImageUploadService.uploadBase64(avatarUrl, 'conference-attendees');
        if (uploadResult.success && uploadResult.url) {
          processedAvatarUrl = uploadResult.url;
        } else {
          console.warn('Failed to upload image to Cloudinary:', uploadResult.error);
          processedAvatarUrl = 'https://via.placeholder.com/150x150?text=Avatar';
        }
      } catch (error) {
        console.warn('Error uploading image to Cloudinary:', error);
        processedAvatarUrl = 'https://via.placeholder.com/150x150?text=Avatar';
      }
    } else if (avatarUrl && !avatarUrl.startsWith('http')) {
      // If it's not a valid URL, use placeholder
      processedAvatarUrl = 'https://via.placeholder.com/150x150?text=Avatar';
    }

    const attendee = await attendeesRepository.create({
      NAME: name,
      EMAIL: email,
      PHONE: phone,
      COMPANY: company,
      POSITION: position,
      AVATAR_URL: processedAvatarUrl || null,
      DIETARY: dietary,
      SPECIAL_NEEDS: specialNeeds,
      DATE_OF_BIRTH: dateOfBirth ? new Date(dateOfBirth) : null,
      GENDER: gender
    });

    // Step 3: Create registration if conference is selected
    let registration = null;
    if (conferenceId) {
      registration = await registrationsRepository.create({
        ATTENDEE_ID: attendee.ID,
        CONFERENCE_ID: conferenceId
      });
    }

    res.status(201).json(ok({
      user: { id: user.ID, email: user.EMAIL, name: user.NAME },
      attendee: { id: attendee.ID, name: attendee.NAME, email: attendee.EMAIL },
      registration: registration ? { id: registration.ID, status: registration.STATUS } : null
    }));
  } catch (e) { 
    next(e); 
  }
}






