import { z } from 'zod';

// Base conference schema
export const conferenceBaseSchema = z.object({
  NAME: z.string().min(1, 'Conference name is required').max(255, 'Conference name too long'),
  DESCRIPTION: z.string().max(1000, 'Description too long').optional(),
  START_DATE: z.string().datetime('Invalid start date format').optional(),
  END_DATE: z.string().datetime('Invalid end date format').optional(),
  LOCATION: z.string().max(255, 'Location too long').optional(),
  CATEGORY: z.string().max(100, 'Category too long').optional(),
  ORGANIZER: z.string().max(255, 'Organizer name too long').optional(),
  CAPACITY: z.number().int().positive('Capacity must be a positive integer').optional(),
  STATUS: z.enum(['draft', 'published', 'active', 'completed', 'cancelled']).optional()
});

// Create conference schema
export const createConferenceSchema = conferenceBaseSchema;

// Update conference schema
export const updateConferenceSchema = conferenceBaseSchema.partial();

// Change status schema
export const changeStatusSchema = z.object({
  status: z.enum(['draft', 'published', 'active', 'completed', 'cancelled'])
});

// Query parameters schema
export const listConferencesSchema = z.object({
  page: z.string().regex(/^\d+$/, 'Page must be a number').transform(Number).default(1),
  limit: z.string().regex(/^\d+$/, 'Limit must be a number').transform(Number).default(10),
  search: z.string().optional(),
  category: z.string().optional(),
  status: z.enum(['draft', 'published', 'active', 'completed', 'cancelled']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional()
});

// ID parameter schema
export const conferenceIdSchema = z.object({
  id: z.string().regex(/^\d+$/, 'ID must be a number').transform(Number)
});
