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
