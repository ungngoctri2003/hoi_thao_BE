import { Router } from 'express';
import { withConn } from '../../config/db';
import oracledb from 'oracledb';
import { globalAIAnalytics } from '../../modules/analytics/analytics.controller';

export const testRouter = Router();

// Create sample data for testing
testRouter.post('/create-sample-data', async (req, res) => {
  try {
    await withConn(async conn => {
      // Check if conference exists
      const conferenceCheck = await conn.execute(
        'SELECT ID FROM CONFERENCES WHERE ROWNUM = 1',
        {},
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      let conferenceId;
      if (!conferenceCheck.rows || conferenceCheck.rows.length === 0) {
        // Create a sample conference
        const conferenceResult = await conn.execute(
          `INSERT INTO CONFERENCES (NAME, DESCRIPTION, START_DATE, END_DATE, LOCATION, STATUS, CAPACITY, CATEGORY, ORGANIZER)
           VALUES (:name, :desc, :start, :end, :location, :status, :capacity, :category, :organizer) 
           RETURNING ID INTO :ID`,
          {
            name: 'Sample Conference 2024',
            desc: 'Sample conference for messaging testing',
            start: new Date(),
            end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            location: 'Virtual',
            status: 'active',
            capacity: 100,
            category: 'Technology',
            organizer: 'Test Organizer',
            ID: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
          },
          { autoCommit: true }
        );

        conferenceId = conferenceResult.outBinds.ID[0];
        console.log(`Created conference with ID: ${conferenceId}`);
      } else {
        conferenceId = conferenceCheck.rows[0].ID;
        console.log(`Using existing conference ID: ${conferenceId}`);
      }

      // Check if sessions exist
      const sessionCheck = await conn.execute(
        'SELECT COUNT(*) as CNT FROM SESSIONS WHERE CONFERENCE_ID = :confId',
        { confId: conferenceId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      const sessionCount = sessionCheck.rows[0].CNT;
      console.log(`Found ${sessionCount} sessions for conference ${conferenceId}`);

      if (sessionCount === 0) {
        // Create messaging sessions
        const sessions = [
          {
            title: 'General Discussion',
            description: 'General messaging and discussion session',
            status: 'active',
          },
          {
            title: 'Networking Chat',
            description: 'Networking and connection session',
            status: 'active',
          },
        ];

        for (const session of sessions) {
          const sessionResult = await conn.execute(
            `INSERT INTO SESSIONS (CONFERENCE_ID, TITLE, DESCRIPTION, STATUS, START_TIME, END_TIME)
             VALUES (:confId, :title, :desc, :status, :start, :end) 
             RETURNING ID INTO :ID`,
            {
              confId: conferenceId,
              title: session.title,
              desc: session.description,
              status: session.status,
              start: new Date(),
              end: new Date(Date.now() + 24 * 60 * 60 * 1000),
              ID: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
            },
            { autoCommit: true }
          );

          const sessionId = sessionResult.outBinds.ID[0];
          console.log(`Created session: ${session.title} (ID: ${sessionId})`);
        }
      }

      // List all sessions
      const sessionsResult = await conn.execute(
        'SELECT ID, TITLE, STATUS FROM SESSIONS WHERE CONFERENCE_ID = :confId ORDER BY ID',
        { confId: conferenceId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      res.json({
        success: true,
        message: 'Sample data created successfully',
        conferenceId,
        sessions: sessionsResult.rows,
      });
    });
  } catch (error) {
    console.error('Error creating sample data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create sample data',
      error: error.message,
    });
  }
});

// Test analytics endpoint without authentication
testRouter.get('/test-analytics', async (req, res) => {
  try {
    await globalAIAnalytics(req, res, error => {
      if (error) {
        console.error('Analytics error:', error);
        res.status(500).json({ error: error.message });
      }
    });
  } catch (error) {
    console.error('Test analytics error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Test session validation without authentication
testRouter.post('/test-session-validation', async (req, res) => {
  try {
    const { createSessionSchema } = require('../../modules/sessions/sessions.schemas');

    console.log('Test session validation request:', {
      params: req.params,
      body: req.body,
      bodyType: typeof req.body,
      bodyKeys: Object.keys(req.body || {}),
    });

    const validation = createSessionSchema.safeParse({
      params: { confId: '1' }, // Use a test conference ID
      body: req.body,
    });

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

    res.json({
      success: true,
      message: 'Validation passed',
      validatedData: validation.data,
    });
  } catch (error) {
    console.error('Test validation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Test simple response without database
testRouter.get('/test-simple', async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Simple test successful',
      data: { test: 'value' },
    });
  } catch (error) {
    console.error('Simple test error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Test database query without update
testRouter.get('/test-db-query/:id', async (req, res) => {
  try {
    const { sessionsRepository } = require('../../modules/sessions/sessions.repository');

    console.log('Testing database query for ID:', req.params.id);

    const item = await sessionsRepository.findById(Number(req.params.id));

    console.log('Database query result:', {
      hasItem: !!item,
      itemType: typeof item,
      itemKeys: item ? Object.keys(item) : 'no item',
    });

    res.json({
      success: true,
      message: 'Database query successful',
      data: item,
    });
  } catch (error) {
    console.error('Database query error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Test session update without authentication
testRouter.patch('/test-session-update/:id', async (req, res) => {
  try {
    const { sessionsRepository } = require('../../modules/sessions/sessions.repository');

    console.log('Test session update request for ID:', req.params.id);

    // Simple update without validation for testing
    const sessionData = req.body;

    // Convert string dates to Date objects if they exist
    if (sessionData.START_TIME) {
      sessionData.START_TIME = new Date(sessionData.START_TIME);
      // Validate that the date is valid
      if (isNaN(sessionData.START_TIME.getTime())) {
        res.status(400).json({
          success: false,
          error: 'Invalid start time format',
        });
        return;
      }
    }

    if (sessionData.END_TIME) {
      sessionData.END_TIME = new Date(sessionData.END_TIME);
      // Validate that the date is valid
      if (isNaN(sessionData.END_TIME.getTime())) {
        res.status(400).json({
          success: false,
          error: 'Invalid end time format',
        });
        return;
      }
    }

    console.log('Updating session with data keys:', Object.keys(sessionData));

    const item = await sessionsRepository.update(Number(req.params.id), sessionData);

    console.log('Test route - Item from repository:', {
      hasItem: !!item,
      itemType: typeof item,
      itemKeys: item ? Object.keys(item) : 'no item',
      itemString: item ? JSON.stringify(item) : 'no item',
    });

    res.json({
      success: true,
      message: 'Session updated successfully',
      data: item
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
        : null,
    });
  } catch (error) {
    console.error('Test session update error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Test session update with dates
testRouter.patch('/test-session-update-dates/:id', async (req, res) => {
  try {
    const { sessionsRepository } = require('../../modules/sessions/sessions.repository');

    console.log('Test session update with dates for ID:', req.params.id);

    // Test with specific date format
    const sessionData = {
      TITLE: 'Test Session with Dates',
      START_TIME: new Date('2025-09-14T15:24:00.000Z'),
      END_TIME: new Date('2025-09-14T16:24:00.000Z'),
    };

    console.log('Updating session with dates:', {
      startTime: sessionData.START_TIME.toISOString(),
      endTime: sessionData.END_TIME.toISOString(),
    });

    const item = await sessionsRepository.update(Number(req.params.id), sessionData);

    res.json({
      success: true,
      message: 'Session updated successfully with dates',
      data: item
        ? {
            ID: item.ID,
            TITLE: item.TITLE,
            START_TIME: item.START_TIME,
            END_TIME: item.END_TIME,
          }
        : null,
    });
  } catch (error) {
    console.error('Test session update with dates error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Test attendees with conferences endpoint without authentication
testRouter.get('/test-attendees-with-conferences', async (req, res) => {
  try {
    const { attendeesRepository } = require('../../modules/attendees/attendees.repository');

    console.log('Testing attendees with conferences endpoint...');

    const { page, limit } = {
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 20,
    };

    const filters = {
      email: req.query['filters[email]'],
      name: req.query['filters[name]'],
      company: req.query['filters[company]'],
      gender: req.query['filters[gender]'],
      conferenceId: req.query['filters[conferenceId]'],
      checkinStatus: req.query['filters[checkinStatus]'],
    } as any;

    const search = (req.query.search as string) || null;
    const includeConferences = req.query.includeConferences === 'true';
    const includeRegistrations = req.query.includeRegistrations === 'true';

    console.log('Query parameters:', {
      page,
      limit,
      filters,
      search,
      includeConferences,
      includeRegistrations,
    });

    const { rows, total } = await attendeesRepository.listWithConferences({
      page,
      limit,
      filters,
      search,
      includeConferences,
      includeRegistrations,
    });

    console.log('Query results:', {
      rowCount: rows.length,
      total,
      firstRow: rows[0] ? Object.keys(rows[0]) : 'no rows',
    });

    res.json({
      success: true,
      message: 'Attendees with conferences query successful',
      data: rows,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Test attendees with conferences error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack,
    });
  }
});
