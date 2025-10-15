import { Request, Response, NextFunction } from 'express';
import oracledb from 'oracledb';
import { withConn } from '../../config/db';
import { ok } from '../../utils/responses';
import { chatGPTService } from '../../services/chatgpt.service';

export async function overview(_req: Request, res: Response, next: NextFunction) {
  try {
    const data = await withConn(async conn => {
      // Get basic counts
      const attendees = await conn.execute(
        `SELECT COUNT(*) AS CNT FROM ATTENDEES`,
        {},
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      const registrations = await conn.execute(
        `SELECT COUNT(*) AS CNT FROM REGISTRATIONS`,
        {},
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      const checkins = await conn.execute(
        `SELECT COUNT(*) AS CNT FROM REGISTRATIONS WHERE STATUS = 'checked-in'`,
        {},
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      const conferences = await conn.execute(
        `SELECT COUNT(*) AS CNT FROM CONFERENCES`,
        {},
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      // Get upcoming events
      const upcomingEvents = await conn.execute(
        `SELECT 
           c.ID,
           c.NAME,
           c.START_DATE,
           c.END_DATE,
           c.LOCATION,
           c.STATUS,
           COUNT(r.ID) as TOTAL_REGISTRATIONS
         FROM CONFERENCES c
         LEFT JOIN REGISTRATIONS r ON c.ID = r.CONFERENCE_ID
         WHERE c.START_DATE >= SYSDATE
         GROUP BY c.ID, c.NAME, c.START_DATE, c.END_DATE, c.LOCATION, c.STATUS
         ORDER BY c.START_DATE
         FETCH FIRST 5 ROWS ONLY`,
        {},
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      const totalAttendees = Number((attendees.rows as Array<{ CNT: number }>)[0]?.CNT || 0);
      const totalRegistrations = Number(
        (registrations.rows as Array<{ CNT: number }>)[0]?.CNT || 0
      );
      const totalCheckIns = Number((checkins.rows as Array<{ CNT: number }>)[0]?.CNT || 0);
      const totalConferences = Number((conferences.rows as Array<{ CNT: number }>)[0]?.CNT || 0);

      const attendanceRate =
        totalRegistrations > 0
          ? Math.round((totalCheckIns / totalRegistrations) * 100 * 10) / 10
          : 0;

      // Mock data for now
      const recentActivity = [
        {
          type: 'checkin',
          message: 'Nguyễn Văn A đã check-in',
          timestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
        },
        {
          type: 'registration',
          message: 'Trần Thị B đăng ký Workshop AI',
          timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        },
        {
          type: 'event',
          message: 'Hội nghị Công nghệ bắt đầu',
          timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        },
        {
          type: 'alert',
          message: 'Sự kiện sắp đầy chỗ',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        },
      ];

      const systemAlerts = [
        {
          type: 'warning',
          message: 'Sự kiện sắp đầy chỗ - Workshop AI có 95% chỗ đã đăng ký',
          timestamp: new Date().toISOString(),
        },
        {
          type: 'info',
          message: 'Check-in sắp bắt đầu - Hội nghị Công nghệ bắt đầu trong 2 giờ',
          timestamp: new Date().toISOString(),
        },
      ];

      // Mock hourly data
      const checkInsLast24h = [
        { timestamp: new Date().setHours(8, 0, 0, 0), count: 15, checkins: 15 },
        { timestamp: new Date().setHours(9, 0, 0, 0), count: 25, checkins: 25 },
        { timestamp: new Date().setHours(10, 0, 0, 0), count: 35, checkins: 35 },
        { timestamp: new Date().setHours(11, 0, 0, 0), count: 20, checkins: 20 },
        { timestamp: new Date().setHours(12, 0, 0, 0), count: 10, checkins: 10 },
        { timestamp: new Date().setHours(13, 0, 0, 0), count: 30, checkins: 30 },
        { timestamp: new Date().setHours(14, 0, 0, 0), count: 40, checkins: 40 },
        { timestamp: new Date().setHours(15, 0, 0, 0), count: 25, checkins: 25 },
        { timestamp: new Date().setHours(16, 0, 0, 0), count: 20, checkins: 20 },
        { timestamp: new Date().setHours(17, 0, 0, 0), count: 15, checkins: 15 },
      ];

      // Mock registration trends
      const registrationTrends = [
        {
          date: '2024-12-01',
          timestamp: new Date('2024-12-01').toISOString(),
          count: 10,
          registrations: 10,
        },
        {
          date: '2024-12-02',
          timestamp: new Date('2024-12-02').toISOString(),
          count: 15,
          registrations: 15,
        },
        {
          date: '2024-12-03',
          timestamp: new Date('2024-12-03').toISOString(),
          count: 20,
          registrations: 20,
        },
        {
          date: '2024-12-04',
          timestamp: new Date('2024-12-04').toISOString(),
          count: 25,
          registrations: 25,
        },
        {
          date: '2024-12-05',
          timestamp: new Date('2024-12-05').toISOString(),
          count: 30,
          registrations: 30,
        },
        {
          date: '2024-12-06',
          timestamp: new Date('2024-12-06').toISOString(),
          count: 35,
          registrations: 35,
        },
        {
          date: '2024-12-07',
          timestamp: new Date('2024-12-07').toISOString(),
          count: 40,
          registrations: 40,
        },
        {
          date: '2024-12-08',
          timestamp: new Date('2024-12-08').toISOString(),
          count: 45,
          registrations: 45,
        },
        {
          date: '2024-12-09',
          timestamp: new Date('2024-12-09').toISOString(),
          count: 50,
          registrations: 50,
        },
        {
          date: '2024-12-10',
          timestamp: new Date('2024-12-10').toISOString(),
          count: 55,
          registrations: 55,
        },
      ];

      // Format upcoming events
      const upcomingEventsData = (
        upcomingEvents.rows as Array<{
          ID: number;
          NAME: string;
          START_DATE: string;
          END_DATE: string;
          LOCATION: string;
          STATUS: string;
          TOTAL_REGISTRATIONS: number;
        }>
      ).map(row => ({
        id: row.ID,
        NAME: row.NAME,
        START_DATE: row.START_DATE,
        END_DATE: row.END_DATE,
        LOCATION: row.LOCATION,
        STATUS: row.STATUS,
        totalRegistrations: row.TOTAL_REGISTRATIONS,
        attendees: row.TOTAL_REGISTRATIONS,
      }));

      // Mock attendance by event
      const attendanceByEventData = [
        { eventName: 'Hội nghị Công nghệ 2024', totalRegistrations: 450, attendanceRate: 87 },
        { eventName: 'Workshop AI & ML', totalRegistrations: 120, attendanceRate: 92 },
        { eventName: 'Seminar Khởi nghiệp', totalRegistrations: 200, attendanceRate: 78 },
      ];

      return {
        // Dashboard overview data
        totalConferences,
        totalAttendees,
        totalCheckIns,
        attendanceRate,
        recentActivity,
        upcomingEvents: upcomingEventsData,

        // Realtime data
        checkInsToday: Math.floor(totalCheckIns * 0.1), // Mock: 10% of total check-ins today
        checkInsLast24h,
        activeUsers: Math.floor(totalAttendees * 0.3), // Mock: 30% of attendees are active
        systemAlerts,

        // Additional data for charts
        registrationTrends,
        attendanceByEvent: attendanceByEventData,
      };
    });
    res.json(ok(data));
  } catch (e) {
    next(e);
  }
}

export async function conferenceAttendance(req: Request, res: Response, next: NextFunction) {
  try {
    const confId = Number(req.params.id);
    const data = await withConn(async conn => {
      const total = await conn.execute(
        `SELECT COUNT(*) AS CNT FROM REGISTRATIONS WHERE CONFERENCE_ID = :id`,
        { id: confId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      const checked = await conn.execute(
        `SELECT COUNT(*) AS CNT FROM REGISTRATIONS WHERE CONFERENCE_ID = :id AND STATUS = 'checked-in'`,
        { id: confId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      return {
        total: Number((total.rows as Array<{ CNT: number }>)[0]?.CNT || 0),
        checked: Number((checked.rows as Array<{ CNT: number }>)[0]?.CNT || 0),
      };
    });
    res.json(ok(data));
  } catch (e) {
    next(e);
  }
}

export async function sessionEngagement(req: Request, res: Response, next: NextFunction) {
  try {
    const sessionId = Number(req.params.id);
    const data = await withConn(async conn => {
      let messages = { rows: [{ CNT: 0 }] };
      try {
        messages = await conn.execute(
          `SELECT COUNT(*) AS CNT FROM MESSAGES WHERE SESSION_ID = :id`,
          { id: sessionId },
          { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
      } catch (error) {
        console.warn('MESSAGES table does not exist, using 0 for message count:', error instanceof Error ? error.message : String(error));
        messages = { rows: [{ CNT: 0 }] };
      }
      return { messages: Number((messages.rows as Array<{ CNT: number }>)[0]?.CNT || 0) };
    });
    res.json(ok(data));
  } catch (e) {
    next(e);
  }
}

export async function networking(_req: Request, res: Response, next: NextFunction) {
  try {
    const data = await withConn(async conn => {
      const matches = await conn.execute(
        `SELECT COUNT(*) AS CNT FROM MATCHES`,
        {},
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      let messages = { rows: [{ CNT: 0 }] };
      try {
        messages = await conn.execute(
          `SELECT COUNT(*) AS CNT FROM MESSAGES`,
          {},
          { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
      } catch (error) {
        console.warn('MESSAGES table does not exist, using 0 for message count:', error instanceof Error ? error.message : String(error));
        messages = { rows: [{ CNT: 0 }] };
      }
      return {
        matches: Number((matches.rows as Array<{ CNT: number }>)[0]?.CNT || 0),
        messages: Number((messages.rows as Array<{ CNT: number }>)[0]?.CNT || 0),
      };
    });
    res.json(ok(data));
  } catch (e) {
    next(e);
  }
}

export async function conferenceAIAnalytics(req: Request, res: Response, next: NextFunction) {
  try {
    const conferenceId = Number(req.query.conferenceId);
    const timeRange = (req.query.timeRange as string) || 'all';

    if (!conferenceId) {
      return res.status(400).json({ error: 'Conference ID is required' });
    }

    const data = await withConn(async conn => {
      // Build date filter based on timeRange
      let dateFilter = '';
      switch (timeRange) {
        case 'today':
          dateFilter = 'AND c.START_DATE >= TRUNC(SYSDATE)';
          break;
        case 'week':
          dateFilter = "AND c.START_DATE >= TRUNC(SYSDATE, 'IW')";
          break;
        case 'month':
          dateFilter = "AND c.START_DATE >= TRUNC(SYSDATE, 'MM')";
          break;
        case 'quarter':
          dateFilter = "AND c.START_DATE >= TRUNC(SYSDATE, 'Q')";
          break;
        case 'year':
          dateFilter = "AND c.START_DATE >= TRUNC(SYSDATE, 'YYYY')";
          break;
        default:
          dateFilter = '';
      }

      // Get conference details
      const conferenceDetails = await conn.execute(
        `SELECT 
           c.ID,
           c.NAME,
           c.START_DATE,
           c.END_DATE,
           c.LOCATION,
           c.STATUS,
           c.DESCRIPTION
         FROM CONFERENCES c 
         WHERE c.ID = :conferenceId`,
        { conferenceId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      if (!conferenceDetails.rows || conferenceDetails.rows.length === 0) {
        throw new Error('Conference not found');
      }

      const conference = (
        conferenceDetails.rows as Array<{
          ID: number;
          NAME: string;
          START_DATE: string;
          END_DATE: string;
          LOCATION: string;
          STATUS: string;
          DESCRIPTION: string;
        }>
      )[0];

      if (!conference) {
        throw new Error('Conference not found');
      }

      // Get total attendees for this conference
      const totalAttendees = await conn.execute(
        `SELECT COUNT(DISTINCT r.ATTENDEE_ID) AS CNT 
         FROM REGISTRATIONS r 
         WHERE r.CONFERENCE_ID = :conferenceId`,
        { conferenceId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      // Get total sessions for this conference
      const totalSessions = await conn.execute(
        `SELECT COUNT(*) AS CNT FROM SESSIONS s 
         WHERE s.CONFERENCE_ID = :conferenceId`,
        { conferenceId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      // Get sessions with details
      const sessions = await conn.execute(
        `SELECT 
           s.ID,
           s.TITLE,
           s.START_TIME,
           s.END_TIME,
           s.STATUS,
           DBMS_LOB.SUBSTR(s.DESCRIPTION, 4000, 1) as DESCRIPTION,
           s.SPEAKER,
           s.ROOM_ID,
           COALESCE(rm.CAPACITY, 0) as CAPACITY,
           COUNT(DISTINCT r.ATTENDEE_ID) as ATTENDEES,
           ROUND(AVG(CASE WHEN r.STATUS = 'checked-in' THEN 100 ELSE 0 END), 1) as ENGAGEMENT,
           4.0 as SATISFACTION
         FROM SESSIONS s
         LEFT JOIN ROOMS rm ON s.ROOM_ID = rm.ID
         LEFT JOIN REGISTRATIONS r ON s.CONFERENCE_ID = r.CONFERENCE_ID
         WHERE s.CONFERENCE_ID = :conferenceId
         GROUP BY s.ID, s.TITLE, s.START_TIME, s.END_TIME, s.STATUS, DBMS_LOB.SUBSTR(s.DESCRIPTION, 4000, 1), s.SPEAKER, s.ROOM_ID, rm.CAPACITY
         ORDER BY s.START_TIME`,
        { conferenceId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      // Get total interactions for this conference
      let totalMessages = { rows: [{ CNT: 0 }] };
      try {
        totalMessages = await conn.execute(
          `SELECT COUNT(*) AS CNT FROM MESSAGES m
           JOIN SESSIONS s ON m.SESSION_ID = s.ID
           WHERE s.CONFERENCE_ID = :conferenceId`,
          { conferenceId },
          { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
      } catch (error) {
        console.warn('MESSAGES table does not exist, using 0 for message count:', error instanceof Error ? error.message : String(error));
        totalMessages = { rows: [{ CNT: 0 }] };
      }

      // Check if CHECKINS table exists before querying it
      let totalCheckins = { rows: [{ CNT: 0 }] };
      try {
        totalCheckins = await conn.execute(
          `SELECT COUNT(*) AS CNT FROM CHECKINS ck
           JOIN REGISTRATIONS r ON ck.REGISTRATION_ID = r.ID
           WHERE r.CONFERENCE_ID = :conferenceId`,
          { conferenceId },
          { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
      } catch (error) {
        console.warn('CHECKINS table does not exist, using 0 for checkin count:', error instanceof Error ? error.message : String(error));
        totalCheckins = { rows: [{ CNT: 0 }] };
      }

      // Get demographics for this conference
      const ageGroups = await conn.execute(
        `SELECT 
           CASE 
             WHEN EXTRACT(YEAR FROM SYSDATE) - EXTRACT(YEAR FROM a.DATE_OF_BIRTH) BETWEEN 18 AND 25 THEN '18-25'
             WHEN EXTRACT(YEAR FROM SYSDATE) - EXTRACT(YEAR FROM a.DATE_OF_BIRTH) BETWEEN 26 AND 35 THEN '26-35'
             WHEN EXTRACT(YEAR FROM SYSDATE) - EXTRACT(YEAR FROM a.DATE_OF_BIRTH) BETWEEN 36 AND 45 THEN '36-45'
             WHEN EXTRACT(YEAR FROM SYSDATE) - EXTRACT(YEAR FROM a.DATE_OF_BIRTH) BETWEEN 46 AND 55 THEN '46-55'
             ELSE '55+'
           END as AGE_RANGE,
           COUNT(*) as COUNT
         FROM ATTENDEES a
         JOIN REGISTRATIONS r ON a.ID = r.ATTENDEE_ID
         WHERE r.CONFERENCE_ID = :conferenceId AND a.DATE_OF_BIRTH IS NOT NULL
         GROUP BY 
           CASE 
             WHEN EXTRACT(YEAR FROM SYSDATE) - EXTRACT(YEAR FROM a.DATE_OF_BIRTH) BETWEEN 18 AND 25 THEN '18-25'
             WHEN EXTRACT(YEAR FROM SYSDATE) - EXTRACT(YEAR FROM a.DATE_OF_BIRTH) BETWEEN 26 AND 35 THEN '26-35'
             WHEN EXTRACT(YEAR FROM SYSDATE) - EXTRACT(YEAR FROM a.DATE_OF_BIRTH) BETWEEN 36 AND 45 THEN '36-45'
             WHEN EXTRACT(YEAR FROM SYSDATE) - EXTRACT(YEAR FROM a.DATE_OF_BIRTH) BETWEEN 46 AND 55 THEN '46-55'
             ELSE '55+'
           END
         ORDER BY AGE_RANGE`,
        { conferenceId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      const industries = await conn.execute(
        `SELECT 
           COALESCE(a.COMPANY, 'Other') as INDUSTRY,
           COUNT(*) as COUNT
         FROM ATTENDEES a
         JOIN REGISTRATIONS r ON a.ID = r.ATTENDEE_ID
         WHERE r.CONFERENCE_ID = :conferenceId
         GROUP BY COALESCE(a.COMPANY, 'Other')
         ORDER BY COUNT DESC
         FETCH FIRST 5 ROWS ONLY`,
        { conferenceId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      // Calculate engagement and satisfaction
      const engagementData = await conn.execute(
        `SELECT 
           COUNT(CASE WHEN r.STATUS = 'checked-in' THEN 1 END) as CHECKED_IN,
           COUNT(r.ID) as TOTAL_REGISTRATIONS
         FROM REGISTRATIONS r
         WHERE r.CONFERENCE_ID = :conferenceId`,
        { conferenceId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      const checkedIn = Number(
        (engagementData.rows as Array<{ CHECKED_IN: number }>)[0]?.CHECKED_IN || 0
      );
      const totalRegistrations = Number(
        (engagementData.rows as Array<{ TOTAL_REGISTRATIONS: number }>)[0]?.TOTAL_REGISTRATIONS || 0
      );
      const averageEngagement =
        totalRegistrations > 0 ? Math.round((checkedIn / totalRegistrations) * 100 * 10) / 10 : 0;

      const satisfactionData = await conn.execute(
        `SELECT 
           AVG(CASE WHEN r.STATUS = 'checked-in' THEN 4.5 ELSE 3.0 END) as AVG_SATISFACTION
         FROM REGISTRATIONS r
         WHERE r.CONFERENCE_ID = :conferenceId`,
        { conferenceId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      const averageSatisfaction = Number(
        (satisfactionData.rows as Array<{ AVG_SATISFACTION: number }>)[0]?.AVG_SATISFACTION || 4.0
      );

      // Calculate percentages for demographics
      const totalUsers = Number((totalAttendees.rows as Array<{ CNT: number }>)[0]?.CNT || 0);

      const ageGroupsWithPercentage = (
        ageGroups.rows as Array<{ AGE_RANGE: string; COUNT: number }>
      ).map(row => ({
        range: row.AGE_RANGE,
        count: row.COUNT,
        percentage: totalUsers > 0 ? Math.round((row.COUNT / totalUsers) * 100) : 0,
      }));

      const industriesWithPercentage = (
        industries.rows as Array<{ INDUSTRY: string; COUNT: number }>
      ).map(row => ({
        industry: row.INDUSTRY,
        count: row.COUNT,
        percentage: totalUsers > 0 ? Math.round((row.COUNT / totalUsers) * 100) : 0,
      }));

      // Generate trends for this conference
      const trends = [
        {
          metric: 'Tổng tham dự',
          value: totalUsers,
          change: 15.2, // Mock data
          trend: 'up' as 'up' | 'down' | 'stable',
        },
        {
          metric: 'Tỷ lệ tương tác',
          value: averageEngagement,
          change: 8.5, // Mock data
          trend: 'up' as 'up' | 'down' | 'stable',
        },
        {
          metric: 'Điểm hài lòng',
          value: averageSatisfaction,
          change: 3.2, // Mock data
          trend: 'up' as 'up' | 'down' | 'stable',
        },
        {
          metric: 'Số phiên',
          value: Number((totalSessions.rows as Array<{ CNT: number }>)[0]?.CNT || 0),
          change: 0, // Mock data
          trend: 'stable' as 'up' | 'down' | 'stable',
        },
      ];

      // Generate hourly stats
      const hourlyStats = await conn.execute(
        `SELECT 
           TO_CHAR(s.START_TIME, 'HH24') as HOUR,
           COUNT(DISTINCT r.ATTENDEE_ID) as ATTENDEES,
           ROUND(AVG(CASE WHEN r.STATUS = 'checked-in' THEN 100 ELSE 0 END), 1) as ENGAGEMENT
         FROM SESSIONS s
         LEFT JOIN REGISTRATIONS r ON s.CONFERENCE_ID = r.CONFERENCE_ID
         WHERE s.CONFERENCE_ID = :conferenceId
         GROUP BY TO_CHAR(s.START_TIME, 'HH24')
         ORDER BY HOUR`,
        { conferenceId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      // Prepare sessions data
      const sessionsData = (
        sessions.rows as Array<{
          ID: number;
          TITLE: string;
          START_TIME: string;
          END_TIME: string;
          STATUS: string;
          DESCRIPTION: string;
          SPEAKER: string;
          ROOM_ID: number;
          CAPACITY: number;
          ATTENDEES: number;
          ENGAGEMENT: number;
          SATISFACTION: number;
        }>
      ).map(row => ({
        id: row.ID,
        title: row.TITLE,
        attendees: row.ATTENDEES,
        engagement: row.ENGAGEMENT,
        satisfaction: row.SATISFACTION,
        startTime: row.START_TIME,
        endTime: row.END_TIME,
        status: row.STATUS,
        description: row.DESCRIPTION,
        speaker: row.SPEAKER,
        roomId: row.ROOM_ID,
        capacity: row.CAPACITY,
      }));

      // Generate AI insights for this conference
      const aiInsights = [
        {
          type: 'trend' as const,
          title: 'Xu hướng tham dự tích cực',
          description: `Hội nghị có ${totalUsers} tham dự viên với tỷ lệ tương tác ${averageEngagement}%`,
          confidence: 85,
          priority: 'high' as const,
        },
        {
          type: 'recommendation' as const,
          title: 'Gợi ý cải thiện',
          description: 'Nên tăng thời gian nghỉ giữa các phiên để tăng tương tác',
          confidence: 78,
          priority: 'medium' as const,
        },
        {
          type: 'alert' as const,
          title: 'Cảnh báo',
          description: 'Một số phiên có tỷ lệ tham dự thấp, cần kiểm tra',
          confidence: 92,
          priority: 'high' as const,
        },
      ];

      // Generate ChatGPT insights
      let chatGPTInsights: {
        insights: Array<{
          type: 'trend' | 'recommendation' | 'alert' | 'prediction';
          title: string;
          description: string;
          confidence: number;
          priority: 'high' | 'medium' | 'low';
          sessionId?: number;
          sessionName?: string;
        }>;
        summary: string;
        recommendations: string[];
      } = {
        insights: [],
        summary: 'Đang phân tích dữ liệu hội nghị...',
        recommendations: [],
      };

      try {
        const conferenceData = {
          conferenceId: conference.ID,
          conferenceName: conference.NAME,
          totalAttendees: totalUsers,
          totalSessions: Number((totalSessions.rows as Array<{ CNT: number }>)[0]?.CNT || 0),
          averageEngagement,
          averageSatisfaction,
          sessions: sessionsData,
          trends,
          demographics: {
            ageGroups: ageGroupsWithPercentage,
            industries: industriesWithPercentage,
          },
        };
        chatGPTInsights = await chatGPTService.generateConferenceInsights(conferenceData);
      } catch (error) {
        chatGPTInsights = {
          insights: [
            {
              type: 'alert',
              title: 'Lỗi kết nối AI',
              description: 'Không thể kết nối với ChatGPT. Đang sử dụng insights cơ bản.',
              confidence: 100,
              priority: 'low',
            },
          ],
          summary: 'Dữ liệu hội nghị đang được phân tích...',
          recommendations: ['Kiểm tra kết nối mạng', 'Thử lại sau ít phút'],
        };
      }

      // Ensure all data is serializable
      const cleanData = {
        conferenceId: Number(conference.ID),
        conferenceName: String(conference.NAME || ''),
        totalAttendees: Number(totalUsers || 0),
        totalSessions: Number((totalSessions.rows as Array<{ CNT: number }>)[0]?.CNT || 0),
        totalInteractions:
          Number((totalMessages.rows as Array<{ CNT: number }>)[0]?.CNT || 0) +
          Number((totalCheckins.rows as Array<{ CNT: number }>)[0]?.CNT || 0),
        averageEngagement: Number(averageEngagement || 0),
        averageSatisfaction: Number(averageSatisfaction || 0),
        conferenceDetails: {
          startDate: conference.START_DATE ? new Date(conference.START_DATE).toISOString() : null,
          endDate: conference.END_DATE ? new Date(conference.END_DATE).toISOString() : null,
          location: String(conference.LOCATION || ''),
          status: String(conference.STATUS || ''),
          description: String(conference.DESCRIPTION || ''),
        },
        sessions: sessionsData,
        trends: trends || [],
        demographics: {
          ageGroups: ageGroupsWithPercentage || [],
          industries: industriesWithPercentage || [],
        },
        aiInsights: aiInsights || [],
        chatGPTInsights: {
          insights: Array.isArray(chatGPTInsights?.insights) ? chatGPTInsights.insights : [],
          summary: String(chatGPTInsights?.summary || ''),
          recommendations: Array.isArray(chatGPTInsights?.recommendations)
            ? chatGPTInsights.recommendations
            : [],
        },
        hourlyStats: (
          hourlyStats.rows as Array<{
            HOUR: string;
            ATTENDEES: number;
            ENGAGEMENT: number;
          }>
        ).map(row => ({
          hour: String(row.HOUR || ''),
          attendees: Number(row.ATTENDEES || 0),
          engagement: Number(row.ENGAGEMENT || 0),
        })),
      };

      return cleanData;
    });
    res.json(ok(data));
  } catch (e) {
    next(e);
  }
}

export async function globalAIAnalytics(req: Request, res: Response, next: NextFunction) {
  try {
    const timeRange = (req.query.timeRange as string) || 'all';

    const data = await withConn(async conn => {
      // Build date filter based on timeRange
      let dateFilter = '';
      switch (timeRange) {
        case 'week':
          dateFilter = "AND c.START_DATE >= TRUNC(SYSDATE, 'IW')";
          break;
        case 'month':
          dateFilter = "AND c.START_DATE >= TRUNC(SYSDATE, 'MM')";
          break;
        case 'quarter':
          dateFilter = "AND c.START_DATE >= TRUNC(SYSDATE, 'Q')";
          break;
        case 'year':
          dateFilter = "AND c.START_DATE >= TRUNC(SYSDATE, 'YYYY')";
          break;
        default:
          dateFilter = '';
      }

      // Get total conferences
      const totalConferences = await conn.execute(
        `SELECT COUNT(*) AS CNT FROM CONFERENCES c WHERE 1=1 ${dateFilter}`,
        {},
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      // Get total attendees across all conferences
      const totalAttendees = await conn.execute(
        `SELECT COUNT(DISTINCT r.ATTENDEE_ID) AS CNT 
         FROM REGISTRATIONS r 
         JOIN CONFERENCES c ON r.CONFERENCE_ID = c.ID
         WHERE 1=1 ${dateFilter}`,
        {},
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      // Get total sessions across all conferences
      const totalSessions = await conn.execute(
        `SELECT COUNT(*) AS CNT FROM SESSIONS`,
        {},
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      // Get total interactions (messages + checkins)
      let totalMessages = { rows: [{ CNT: 0 }] };
      try {
        totalMessages = await conn.execute(
          `SELECT COUNT(*) AS CNT FROM MESSAGES`,
          {},
          { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
      } catch (error) {
        console.warn('MESSAGES table does not exist, using 0 for message count:', error instanceof Error ? error.message : String(error));
        totalMessages = { rows: [{ CNT: 0 }] };
      }
      
      // Check if CHECKINS table exists before querying it
      let totalCheckins = { rows: [{ CNT: 0 }] };
      try {
        totalCheckins = await conn.execute(
          `SELECT COUNT(*) AS CNT FROM CHECKINS`,
          {},
          { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
      } catch (error) {
        console.warn('CHECKINS table does not exist, using 0 for checkin count:', error instanceof Error ? error.message : String(error));
        totalCheckins = { rows: [{ CNT: 0 }] };
      }

      // Get top performing conferences
      const topConferences = await conn.execute(
        `SELECT 
           c.ID as CONFERENCE_ID,
           c.NAME as CONFERENCE_NAME,
           COUNT(DISTINCT r.ATTENDEE_ID) as ATTENDEES,
           ROUND(AVG(CASE WHEN r.STATUS = 'checked-in' THEN 100 ELSE 0 END), 1) as ENGAGEMENT,
           4.0 as SATISFACTION
         FROM CONFERENCES c
         LEFT JOIN REGISTRATIONS r ON c.ID = r.CONFERENCE_ID
         GROUP BY c.ID, c.NAME
         ORDER BY ATTENDEES DESC, ENGAGEMENT DESC
         FETCH FIRST 5 ROWS ONLY`,
        {},
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      // Get demographics - age groups
      const ageGroups = await conn.execute(
        `SELECT 
           CASE 
             WHEN EXTRACT(YEAR FROM SYSDATE) - EXTRACT(YEAR FROM a.DATE_OF_BIRTH) BETWEEN 18 AND 25 THEN '18-25'
             WHEN EXTRACT(YEAR FROM SYSDATE) - EXTRACT(YEAR FROM a.DATE_OF_BIRTH) BETWEEN 26 AND 35 THEN '26-35'
             WHEN EXTRACT(YEAR FROM SYSDATE) - EXTRACT(YEAR FROM a.DATE_OF_BIRTH) BETWEEN 36 AND 45 THEN '36-45'
             WHEN EXTRACT(YEAR FROM SYSDATE) - EXTRACT(YEAR FROM a.DATE_OF_BIRTH) BETWEEN 46 AND 55 THEN '46-55'
             ELSE '55+'
           END as AGE_RANGE,
           COUNT(*) as COUNT
         FROM ATTENDEES a
         JOIN REGISTRATIONS r ON a.ID = r.ATTENDEE_ID
         WHERE a.DATE_OF_BIRTH IS NOT NULL
         GROUP BY 
           CASE 
             WHEN EXTRACT(YEAR FROM SYSDATE) - EXTRACT(YEAR FROM a.DATE_OF_BIRTH) BETWEEN 18 AND 25 THEN '18-25'
             WHEN EXTRACT(YEAR FROM SYSDATE) - EXTRACT(YEAR FROM a.DATE_OF_BIRTH) BETWEEN 26 AND 35 THEN '26-35'
             WHEN EXTRACT(YEAR FROM SYSDATE) - EXTRACT(YEAR FROM a.DATE_OF_BIRTH) BETWEEN 36 AND 45 THEN '36-45'
             WHEN EXTRACT(YEAR FROM SYSDATE) - EXTRACT(YEAR FROM a.DATE_OF_BIRTH) BETWEEN 46 AND 55 THEN '46-55'
             ELSE '55+'
           END
         ORDER BY AGE_RANGE`,
        {},
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      // Get demographics - industries
      const industries = await conn.execute(
        `SELECT 
           COALESCE(a.COMPANY, 'Other') as INDUSTRY,
           COUNT(*) as COUNT
         FROM ATTENDEES a
         JOIN REGISTRATIONS r ON a.ID = r.ATTENDEE_ID
         GROUP BY COALESCE(a.COMPANY, 'Other')
         ORDER BY COUNT DESC
         FETCH FIRST 5 ROWS ONLY`,
        {},
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      // Calculate percentages for demographics
      const totalUsers = Number((totalAttendees.rows as Array<{ CNT: number }>)[0]?.CNT || 0);

      const ageGroupsWithPercentage = (
        ageGroups.rows as Array<{ AGE_RANGE: string; COUNT: number }>
      ).map(row => ({
        range: row.AGE_RANGE,
        count: row.COUNT,
        percentage: totalUsers > 0 ? Math.round((row.COUNT / totalUsers) * 100) : 0,
      }));

      const industriesWithPercentage = (
        industries.rows as Array<{ INDUSTRY: string; COUNT: number }>
      ).map(row => ({
        industry: row.INDUSTRY,
        count: row.COUNT,
        percentage: totalUsers > 0 ? Math.round((row.COUNT / totalUsers) * 100) : 0,
      }));

      // Calculate real engagement rate
      const engagementData = await conn.execute(
        `SELECT 
           COUNT(CASE WHEN r.STATUS = 'checked-in' THEN 1 END) as CHECKED_IN,
           COUNT(r.ID) as TOTAL_REGISTRATIONS
         FROM REGISTRATIONS r`,
        {},
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      const checkedIn = Number(
        (engagementData.rows as Array<{ CHECKED_IN: number }>)[0]?.CHECKED_IN || 0
      );
      const totalRegistrations = Number(
        (engagementData.rows as Array<{ TOTAL_REGISTRATIONS: number }>)[0]?.TOTAL_REGISTRATIONS || 0
      );
      const realEngagement =
        totalRegistrations > 0 ? Math.round((checkedIn / totalRegistrations) * 100 * 10) / 10 : 0;

      // Calculate real satisfaction (mock for now, would need feedback table)
      const satisfactionData = await conn.execute(
        `SELECT 
           AVG(CASE WHEN r.STATUS = 'checked-in' THEN 4.5 ELSE 3.0 END) as AVG_SATISFACTION
         FROM REGISTRATIONS r`,
        {},
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      const realSatisfaction = Number(
        (satisfactionData.rows as Array<{ AVG_SATISFACTION: number }>)[0]?.AVG_SATISFACTION || 4.0
      );

      // Calculate monthly stats
      const monthlyStats = await conn.execute(
        `SELECT 
           TO_CHAR(c.START_DATE, 'YYYY-MM') as MONTH,
           COUNT(DISTINCT c.ID) as CONFERENCES,
           COUNT(DISTINCT r.ATTENDEE_ID) as ATTENDEES,
           ROUND(AVG(CASE WHEN r.STATUS = 'checked-in' THEN 100 ELSE 0 END), 1) as ENGAGEMENT
         FROM CONFERENCES c
         LEFT JOIN REGISTRATIONS r ON c.ID = r.CONFERENCE_ID
         WHERE c.START_DATE >= ADD_MONTHS(SYSDATE, -12)
         GROUP BY TO_CHAR(c.START_DATE, 'YYYY-MM')
         ORDER BY MONTH`,
        {},
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      // Get all required counts first
      const totalConferencesCount = Number(
        (totalConferences.rows as Array<{ CNT: number }>)[0]?.CNT || 0
      );
      const totalSessionsCount = Number(
        (totalSessions.rows as Array<{ CNT: number }>)[0]?.CNT || 0
      );

      // Calculate global trends based on real data
      const previousMonthAttendees = Math.max(0, totalUsers - Math.floor(totalUsers * 0.15)); // Simulate 15% growth
      const previousEngagement = Math.max(0, realEngagement - 5); // Simulate 5% improvement
      const previousSatisfaction = Math.max(0, realSatisfaction - 0.2); // Simulate 0.2 improvement
      const avgSessionsPerConference =
        totalConferencesCount > 0 ? Math.round(totalSessionsCount / totalConferencesCount) : 0;

      // Prepare data for ChatGPT analysis
      const topConferencesData = (
        topConferences.rows as Array<{
          CONFERENCE_ID: number;
          CONFERENCE_NAME: string;
          ATTENDEES: number;
          ENGAGEMENT: number;
          SATISFACTION: number;
        }>
      ).map((row, index) => ({
        id: row.CONFERENCE_ID,
        name: row.CONFERENCE_NAME,
        attendees: row.ATTENDEES,
        engagement: row.ENGAGEMENT,
        satisfaction: row.SATISFACTION,
        trend: (index < 2 ? 'up' : index === 2 ? 'stable' : 'down') as 'up' | 'down' | 'stable',
      }));

      const analyticsData = {
        totalConferences: totalConferencesCount,
        totalAttendees: totalUsers,
        totalSessions: totalSessionsCount,
        totalInteractions:
          Number((totalMessages.rows as Array<{ CNT: number }>)[0]?.CNT || 0) +
          Number((totalCheckins.rows as Array<{ CNT: number }>)[0]?.CNT || 0),
        averageEngagement: realEngagement,
        averageSatisfaction: realSatisfaction,
        topPerformingConferences: topConferencesData,
        globalTrends: [
          {
            metric: 'Tổng tham dự',
            value: totalUsers,
            change:
              totalUsers > 0
                ? Math.round(
                    ((totalUsers - previousMonthAttendees) / previousMonthAttendees) * 100 * 10
                  ) / 10
                : 0,
            trend: (totalUsers > previousMonthAttendees
              ? 'up'
              : totalUsers < previousMonthAttendees
              ? 'down'
              : 'stable') as 'up' | 'down' | 'stable',
          },
          {
            metric: 'Tỷ lệ tương tác',
            value: realEngagement,
            change:
              realEngagement > 0
                ? Math.round(
                    ((realEngagement - previousEngagement) / previousEngagement) * 100 * 10
                  ) / 10
                : 0,
            trend: (realEngagement > previousEngagement
              ? 'up'
              : realEngagement < previousEngagement
              ? 'down'
              : 'stable') as 'up' | 'down' | 'stable',
          },
          {
            metric: 'Điểm hài lòng',
            value: realSatisfaction,
            change:
              realSatisfaction > 0
                ? Math.round(
                    ((realSatisfaction - previousSatisfaction) / previousSatisfaction) * 100 * 10
                  ) / 10
                : 0,
            trend: (realSatisfaction > previousSatisfaction
              ? 'up'
              : realSatisfaction < previousSatisfaction
              ? 'down'
              : 'stable') as 'up' | 'down' | 'stable',
          },
          {
            metric: 'Số phiên trung bình',
            value: avgSessionsPerConference,
            change: -2.1, // Mock for now
            trend: 'down' as 'up' | 'down' | 'stable',
          },
        ],
        demographics: {
          ageGroups: ageGroupsWithPercentage,
          industries: industriesWithPercentage,
        },
        monthlyStats: (
          monthlyStats.rows as Array<{
            MONTH: string;
            CONFERENCES: number;
            ATTENDEES: number;
            ENGAGEMENT: number;
          }>
        ).map(row => ({
          month: row.MONTH,
          conferences: row.CONFERENCES,
          attendees: row.ATTENDEES,
          engagement: row.ENGAGEMENT,
        })),
      };

      // Generate ChatGPT insights
      let chatGPTInsights: {
        insights: Array<{
          type: 'trend' | 'recommendation' | 'alert' | 'prediction';
          title: string;
          description: string;
          confidence: number;
          priority: 'high' | 'medium' | 'low';
          conferenceId?: number;
          conferenceName?: string;
        }>;
        summary: string;
        recommendations: string[];
      } = {
        insights: [],
        summary: 'Đang phân tích dữ liệu...',
        recommendations: [],
      };

      try {
        chatGPTInsights = await chatGPTService.generateAnalyticsInsights(analyticsData);
      } catch (error) {
        // Fallback to basic insights
        chatGPTInsights = {
          insights: [
            {
              type: 'alert',
              title: 'Lỗi kết nối AI',
              description: 'Không thể kết nối với ChatGPT. Đang sử dụng insights cơ bản.',
              confidence: 100,
              priority: 'low',
            },
          ],
          summary: 'Dữ liệu hội nghị đang được phân tích...',
          recommendations: ['Kiểm tra kết nối mạng', 'Thử lại sau ít phút'],
        };
      }

      return {
        totalConferences: totalConferencesCount,
        totalAttendees: totalUsers,
        totalSessions: totalSessionsCount,
        totalInteractions:
          Number((totalMessages.rows as Array<{ CNT: number }>)[0]?.CNT || 0) +
          Number((totalCheckins.rows as Array<{ CNT: number }>)[0]?.CNT || 0),
        averageEngagement: realEngagement,
        averageSatisfaction: realSatisfaction,
        topPerformingConferences: topConferencesData,
        globalTrends: analyticsData.globalTrends,
        demographics: {
          ageGroups: ageGroupsWithPercentage,
          industries: industriesWithPercentage,
        },
        aiInsights: chatGPTInsights.insights,
        chatGPTInsights: {
          insights: chatGPTInsights.insights,
          summary: chatGPTInsights.summary,
          recommendations: chatGPTInsights.recommendations,
        },
        monthlyStats: analyticsData.monthlyStats,
      };
    });
    res.json(ok(data));
  } catch (e) {
    next(e);
  }
}
