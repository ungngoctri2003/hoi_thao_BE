import { Request, Response, NextFunction } from 'express';
import { messagesRepository } from './messages.repository';
import { parsePagination, meta } from '../../utils/pagination';
import { ok } from '../../utils/responses';
import { emitSessionMessage } from '../../sockets';

export async function listBySession(req: Request, res: Response, next: NextFunction) {
  try {
    const { page, limit } = parsePagination(req.query);
    const { rows, total } = await messagesRepository.listBySession(Number(req.params.id), page, limit);
    
    // Clean the data to prevent circular references
    const cleanRows = rows.map(row => ({
      id: row.ID,
      sessionId: row.SESSION_ID,
      attendeeId: row.ATTENDEE_ID,
      content: row.CONTENT,
      type: row.TYPE,
      timestamp: row.TS
    }));
    
    res.json(ok(cleanRows, meta(page, limit, total)));
  } catch (e) { next(e); }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const row = await messagesRepository.create(Number(req.params.id), req.body.attendeeId ?? null, req.body.type || 'text', String(req.body.content || ''));
    
    // Create a clean message object to avoid circular references
    const messageData = {
      id: row.ID,
      sessionId: row.SESSION_ID,
      attendeeId: row.ATTENDEE_ID,
      content: row.CONTENT,
      type: row.TYPE,
      timestamp: row.TS,
      isRead: true
    };
    
    // Create a clean response object to avoid circular references
    const cleanRow = {
      id: row.ID,
      sessionId: row.SESSION_ID,
      attendeeId: row.ATTENDEE_ID,
      content: row.CONTENT,
      type: row.TYPE,
      timestamp: row.TS
    };
    
    emitSessionMessage(Number(req.params.id), messageData);
    res.status(201).json(ok(cleanRow));
  } catch (e) { next(e); }
}













