import { z } from 'zod';

export const sessionBaseSchema = z.object({
  TITLE: z
    .string('Session title must be a string')
    .min(1, 'Session title cannot be empty')
    .max(255, 'Session title is too long (maximum 255 characters)'),
  SPEAKER: z
    .string('Speaker name must be a string')
    .max(255, 'Speaker name is too long (maximum 255 characters)')
    .optional()
    .or(z.literal(''))
    .nullable(),
  START_TIME: z.string('Start time is required and must be a string').refine(val => {
    // Accept various datetime formats
    const date = new Date(val);
    return !isNaN(date.getTime());
  }, 'Invalid start time format'),
  END_TIME: z.string('End time is required and must be a string').refine(val => {
    // Accept various datetime formats
    const date = new Date(val);
    return !isNaN(date.getTime());
  }, 'Invalid end time format'),
  STATUS: z
    .enum(
      ['upcoming', 'live', 'active', 'completed', 'ended'],
      'Status must be one of: upcoming, live, active, completed, ended'
    )
    .default('upcoming'),
  DESCRIPTION: z
    .string('Description must be a string')
    .max(2000, 'Description is too long (maximum 2000 characters)')
    .optional()
    .or(z.literal(''))
    .nullable(),
  ROOM_ID: z
    .number('Room ID must be a number')
    .int('Room ID must be an integer')
    .positive('Room ID must be a positive number')
    .optional()
    .nullable(),
});

export const createSessionSchema = z.object({
  params: z.object({
    confId: z.string().regex(/^\d+$/, 'Conference ID must be a number').transform(Number),
  }),
  body: sessionBaseSchema,
});

export const updateSessionSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'Session ID must be a number').transform(Number),
  }),
  body: sessionBaseSchema.partial(),
});

export const sessionIdSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'Session ID must be a number').transform(Number),
  }),
});

export const assignRoomSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'Session ID must be a number').transform(Number),
  }),
  body: z.object({
    roomId: z.number().int().positive('Room ID must be a positive integer'),
  }),
});

export const listSessionsSchema = z.object({
  query: z.object({
    conferenceId: z
      .string()
      .regex(/^\d+$/, 'Conference ID must be a number')
      .transform(Number)
      .optional(),
    status: z.string().optional(),
    roomId: z.string().regex(/^\d+$/, 'Room ID must be a number').transform(Number).optional(),
  }),
});
