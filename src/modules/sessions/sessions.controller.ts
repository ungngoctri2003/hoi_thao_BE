import { Request, Response, NextFunction } from 'express';
import { sessionsRepository } from './sessions.repository';
import { ok } from '../../utils/responses';
import {
  createSessionSchema,
  updateSessionSchema,
  sessionIdSchema,
  assignRoomSchema,
  listSessionsSchema,
} from './sessions.schemas';

export async function listPublic(req: Request, res: Response, next: NextFunction) {
  try {
    const conferenceId = req.query.conferenceId ? Number(req.query.conferenceId) : undefined;
    const status = (req.query.status as string) || undefined;

    const rows = await sessionsRepository.listAll({ conferenceId, status });
    res.json(ok(rows));
  } catch (e) {
    next(e);
  }
}

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const rows = await sessionsRepository.list(Number(req.params.confId), {
      status: (req.query.status as string) || undefined,
      roomId: req.query.roomId ? Number(req.query.roomId) : undefined,
    });
    res.json(ok(rows));
  } catch (e) {
    next(e);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const item = await sessionsRepository.findById(Number(req.params.id));
    if (!item) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Session not found' } });
      return;
    }
    res.json(ok(item));
  } catch (e) {
    next(e);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    // Debug: Log the incoming request data
    console.log('Session creation request:', {
      params: req.params,
      body: req.body,
      bodyType: typeof req.body,
      bodyKeys: Object.keys(req.body || {}),
    });

    // Validate the request data
    const validation = createSessionSchema.safeParse({ params: req.params, body: req.body });
    if (!validation.success) {
      console.log('Validation failed:', validation.error.issues);

      // Create a more user-friendly error message
      const errors = validation.error.issues.map(issue => {
        const field = issue.path.join('.');
        let message = issue.message;

        // Provide more specific error messages for common issues
        if (field === 'body.TITLE') {
          if (issue.code === 'invalid_type' && issue.input === undefined) {
            message = 'Session title is required';
          } else if (issue.code === 'invalid_type' && issue.input === null) {
            message = 'Session title cannot be null';
          } else if (issue.code === 'too_small' && issue.input === '') {
            message = 'Session title cannot be empty';
          }
        }

        return {
          field,
          message,
        };
      });

      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid session data. Please check the required fields.',
          details: errors,
        },
      });
      return;
    }

    const { params, body } = validation.data;

    // Check required fields for database constraints
    if (!body.START_TIME || !body.END_TIME) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'START_TIME and END_TIME are required fields',
        },
      });
      return;
    }

    // Convert the validated data to match the repository interface
    const sessionData = {
      ...body,
      ROOM_ID: body.ROOM_ID || null,
      SPEAKER: body.SPEAKER || null,
      DESCRIPTION: body.DESCRIPTION || null,
      START_TIME: new Date(body.START_TIME),
      END_TIME: new Date(body.END_TIME),
    };

    const item = await sessionsRepository.create(params.confId, sessionData);
    res.status(201).json(ok(item));
  } catch (e) {
    next(e);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    // Debug: Log the incoming request data
    console.log('Session update request:', {
      params: req.params,
      body: req.body,
      bodyType: typeof req.body,
      bodyKeys: Object.keys(req.body || {}),
    });

    // Validate the request data
    const validation = updateSessionSchema.safeParse({ params: req.params, body: req.body });
    if (!validation.success) {
      console.log('Validation failed:', validation.error.issues);

      // Create a more user-friendly error message
      const errors = validation.error.issues.map(issue => {
        const field = issue.path.join('.');
        let message = issue.message;

        // Provide more specific error messages for common issues
        if (field === 'body.TITLE') {
          if (issue.code === 'invalid_type' && issue.input === undefined) {
            message = 'Session title is required';
          } else if (issue.code === 'invalid_type' && issue.input === null) {
            message = 'Session title cannot be null';
          } else if (issue.code === 'too_small' && issue.input === '') {
            message = 'Session title cannot be empty';
          }
        }

        return {
          field,
          message,
        };
      });

      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid session data. Please check the required fields.',
          details: errors,
        },
      });
      return;
    }

    const { params, body } = validation.data;

    // Convert the validated data to match the repository interface
    const sessionData: any = { ...body };

    // Convert string dates to Date objects if they exist
    if (body.START_TIME) {
      sessionData.START_TIME = new Date(body.START_TIME);
      // Validate that the date is valid
      if (isNaN(sessionData.START_TIME.getTime())) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid start time format',
          },
        });
        return;
      }
    }

    if (body.END_TIME) {
      sessionData.END_TIME = new Date(body.END_TIME);
      // Validate that the date is valid
      if (isNaN(sessionData.END_TIME.getTime())) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid end time format',
          },
        });
        return;
      }
    }

    // Debug logging
    console.log('Updating session with data:', {
      id: params.id,
      sessionData,
      startTime: sessionData.START_TIME ? sessionData.START_TIME.toISOString() : 'not provided',
      endTime: sessionData.END_TIME ? sessionData.END_TIME.toISOString() : 'not provided',
    });

    const item = await sessionsRepository.update(params.id, sessionData);

    // Debug: Log the item to see what we're getting
    console.log('Item returned from repository:', {
      type: typeof item,
      isArray: Array.isArray(item),
      keys: item ? Object.keys(item) : 'null',
      hasCircularRef: item ? JSON.stringify(item).includes('cOpts') : false,
    });

    // Ensure we have a clean object
    const cleanItem = item
      ? {
          ID: item.ID,
          CONFERENCE_ID: item.CONFERENCE_ID,
          ROOM_ID: item.ROOM_ID,
          TITLE: item.TITLE,
          SPEAKER: item.SPEAKER,
          START_TIME: item.START_TIME,
          END_TIME: item.END_TIME,
          STATUS: item.STATUS,
          DESCRIPTION: item.DESCRIPTION,
        }
      : null;

    res.json(ok(cleanItem));
  } catch (e) {
    next(e);
  }
}

export async function assignRoom(req: Request, res: Response, next: NextFunction) {
  try {
    const item = await sessionsRepository.assignRoom(Number(req.params.id), req.body.roomId);
    res.json(ok(item));
  } catch (e) {
    next(e);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await sessionsRepository.remove(Number(req.params.id));
    res.status(204).send();
  } catch (e) {
    next(e);
  }
}
