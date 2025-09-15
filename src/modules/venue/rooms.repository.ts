import { withConn } from '../../config/db';
import oracledb from 'oracledb';

// Helper function to safely parse features JSON
function parseFeatures(features: any): string[] {
  console.log('Parsing features:', {
    features,
    type: typeof features,
    isArray: Array.isArray(features),
    constructor: features?.constructor?.name,
  });

  if (!features) return [];

  // If it's already an array, clean and validate items
  if (Array.isArray(features)) {
    return features
      .map(item => {
        // Only process string items, skip non-strings
        if (typeof item === 'string') {
          // Clean the string
          const cleaned = item.trim();
          // Skip empty strings and invalid values
          if (
            !cleaned ||
            cleaned === 'null' ||
            cleaned === 'undefined' ||
            cleaned === '[object Object]' ||
            cleaned === 'DB_TYPE_CLOB' ||
            cleaned === 'Có sẵn' ||
            cleaned === 'Không có' ||
            cleaned.startsWith('Tính năng ')
          ) {
            return null;
          }
          return cleaned;
        }
        // Skip non-string items entirely
        return null;
      })
      .filter(item => item !== null && item !== undefined);
  }

  // If it's a string, try to parse it as JSON
  if (typeof features === 'string') {
    try {
      const parsed = JSON.parse(features);
      if (Array.isArray(parsed)) {
        return parsed
          .map(item => {
            if (typeof item === 'string') {
              const cleaned = item.trim();
              if (
                !cleaned ||
                cleaned === 'null' ||
                cleaned === 'undefined' ||
                cleaned === '[object Object]' ||
                cleaned === 'DB_TYPE_CLOB' ||
                cleaned === 'Có sẵn' ||
                cleaned === 'Không có' ||
                cleaned.startsWith('Tính năng ')
              ) {
                return null;
              }
              return cleaned;
            }
            return null;
          })
          .filter(item => item !== null && item !== undefined);
      }
      return [];
    } catch (error) {
      console.warn('Failed to parse features JSON:', features, error);
      return [];
    }
  }

  // Handle Oracle CLOB objects or other object types
  if (typeof features === 'object' && features !== null) {
    // Check if it's an Oracle Lob object
    if (features.constructor && features.constructor.name === 'Lob') {
      try {
        // For Oracle Lob, we need to read it asynchronously
        // But since this is a sync function, we'll return empty array for now
        // The proper solution would be to make this function async
        console.log('Oracle Lob detected, length:', features._length);
        return [];
      } catch (error) {
        console.warn('Failed to parse Lob features:', error);
        return [];
      }
    }

    // Check if it's an Oracle CLOB or similar object
    if (features.constructor && features.constructor.name === 'DB_TYPE_CLOB') {
      try {
        // Try to read the CLOB content
        const content = features.toString();
        if (content && typeof content === 'string') {
          const parsed = JSON.parse(content);
          if (Array.isArray(parsed)) {
            return parsed.filter(item => typeof item === 'string' && item.trim());
          }
        }
      } catch (error) {
        console.warn('Failed to parse CLOB features:', error);
      }
    }

    // If it's a plain object, try to convert to string and parse
    try {
      const stringValue = features.toString();
      if (stringValue && stringValue !== '[object Object]') {
        const parsed = JSON.parse(stringValue);
        if (Array.isArray(parsed)) {
          return parsed.filter(item => typeof item === 'string' && item.trim());
        }
      }
    } catch (error) {
      console.warn('Failed to parse object features:', error);
    }
  }

  // For other types, return empty array
  return [];
}

export const roomsRepository = {
  async listAll() {
    return withConn(async conn => {
      const res = await conn.execute(
        `SELECT r.ID, r.FLOOR_ID, r.NAME, r.CAPACITY, r.DESCRIPTION, r.ROOM_TYPE, r.FEATURES, r.STATUS, f.FLOOR_NUMBER as FLOOR_NAME, f.CONFERENCE_ID, c.NAME as CONFERENCE_NAME 
         FROM ROOMS r 
         JOIN FLOORS f ON r.FLOOR_ID = f.ID 
         JOIN CONFERENCES c ON f.CONFERENCE_ID = c.ID 
         ORDER BY c.NAME, f.FLOOR_NUMBER, r.NAME`,
        {},
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      // Safely extract rows and create new objects to avoid circular references
      const rooms = (res.rows as any[]) || [];
      const processedRooms = [];

      for (const room of rooms) {
        // Create a completely new object to avoid any Oracle connection references
        const cleanRoom: any = {};

        // Safely copy each property
        if (room.ID !== undefined) cleanRoom.ID = room.ID;
        if (room.FLOOR_ID !== undefined) cleanRoom.FLOOR_ID = room.FLOOR_ID;
        if (room.NAME !== undefined) cleanRoom.NAME = room.NAME;
        if (room.CAPACITY !== undefined) cleanRoom.CAPACITY = room.CAPACITY;
        if (room.DESCRIPTION !== undefined) cleanRoom.DESCRIPTION = room.DESCRIPTION;
        if (room.ROOM_TYPE !== undefined) cleanRoom.ROOM_TYPE = room.ROOM_TYPE;
        if (room.STATUS !== undefined) cleanRoom.STATUS = room.STATUS;
        if (room.FLOOR_NAME !== undefined) cleanRoom.FLOOR_NAME = room.FLOOR_NAME;
        if (room.CONFERENCE_ID !== undefined) cleanRoom.CONFERENCE_ID = room.CONFERENCE_ID;
        if (room.CONFERENCE_NAME !== undefined) cleanRoom.CONFERENCE_NAME = room.CONFERENCE_NAME;

        // Parse features safely - handle Oracle Lob
        if (
          room.FEATURES &&
          typeof room.FEATURES === 'object' &&
          room.FEATURES.constructor &&
          room.FEATURES.constructor.name === 'Lob'
        ) {
          try {
            // Read the Lob content asynchronously
            const featuresString = await room.FEATURES.getData();
            if (featuresString && typeof featuresString === 'string') {
              const parsed = JSON.parse(featuresString);
              if (Array.isArray(parsed)) {
                cleanRoom.FEATURES = parsed.filter(item => typeof item === 'string' && item.trim());
              } else {
                cleanRoom.FEATURES = [];
              }
            } else {
              cleanRoom.FEATURES = [];
            }
          } catch (error) {
            console.warn('Failed to read Lob features:', error);
            cleanRoom.FEATURES = [];
          }
        } else {
          cleanRoom.FEATURES = parseFeatures(room.FEATURES);
        }

        processedRooms.push(cleanRoom);
      }

      return processedRooms;
    });
  },
  async list(floorId: number) {
    return withConn(async conn => {
      const res = await conn.execute(
        `SELECT ID, FLOOR_ID, NAME, CAPACITY FROM ROOMS WHERE FLOOR_ID = :floor ORDER BY NAME`,
        { floor: floorId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      return (res.rows as any[]) || [];
    });
  },
  async create(
    floorId: number,
    name: string,
    capacity?: number,
    description?: string,
    roomType?: string,
    features?: string[],
    status?: string
  ) {
    return withConn(async conn => {
      const res = await conn.execute(
        `INSERT INTO ROOMS (FLOOR_ID, NAME, CAPACITY, DESCRIPTION, ROOM_TYPE, FEATURES, STATUS) VALUES (:room_floor_id, :room_name, :room_capacity, :room_description, :room_type, :room_features, :room_status) RETURNING ID INTO :room_id`,
        {
          room_floor_id: floorId,
          room_name: name,
          room_capacity: capacity || null,
          room_description: description || null,
          room_type: roomType || null,
          room_features: features ? JSON.stringify(features) : null,
          room_status: status || 'available',
          room_id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
        },
        { autoCommit: true }
      );
      return (res.outBinds as { room_id: number[] }).room_id[0];
    });
  },
  async update(
    id: number,
    name: string,
    capacity?: number,
    description?: string,
    roomType?: string,
    features?: string[],
    status?: string
  ) {
    return withConn(async conn => {
      await conn.execute(
        `UPDATE ROOMS SET NAME = :room_name, CAPACITY = :room_capacity, DESCRIPTION = :room_description, ROOM_TYPE = :room_type, FEATURES = :room_features, STATUS = :room_status WHERE ID = :room_id`,
        {
          room_name: name,
          room_capacity: capacity || null,
          room_description: description || null,
          room_type: roomType || null,
          room_features: features ? JSON.stringify(features) : null,
          room_status: status || 'available',
          room_id: id,
        },
        { autoCommit: true }
      );
    });
  },
  async getById(id: number) {
    return withConn(async conn => {
      const res = await conn.execute(
        `SELECT r.ID, r.FLOOR_ID, r.NAME, r.CAPACITY, r.DESCRIPTION, r.ROOM_TYPE, r.FEATURES, r.STATUS, f.FLOOR_NUMBER as FLOOR_NAME, f.CONFERENCE_ID, c.NAME as CONFERENCE_NAME 
         FROM ROOMS r 
         JOIN FLOORS f ON r.FLOOR_ID = f.ID 
         JOIN CONFERENCES c ON f.CONFERENCE_ID = c.ID 
         WHERE r.ID = :id`,
        { id },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      const room = (res.rows as any[])?.[0];
      if (!room) return null;

      // Create a completely new object to avoid any Oracle connection references
      const cleanRoom: any = {};

      // Safely copy each property
      if (room.ID !== undefined) cleanRoom.ID = room.ID;
      if (room.FLOOR_ID !== undefined) cleanRoom.FLOOR_ID = room.FLOOR_ID;
      if (room.NAME !== undefined) cleanRoom.NAME = room.NAME;
      if (room.CAPACITY !== undefined) cleanRoom.CAPACITY = room.CAPACITY;
      if (room.DESCRIPTION !== undefined) cleanRoom.DESCRIPTION = room.DESCRIPTION;
      if (room.ROOM_TYPE !== undefined) cleanRoom.ROOM_TYPE = room.ROOM_TYPE;
      if (room.STATUS !== undefined) cleanRoom.STATUS = room.STATUS;
      if (room.FLOOR_NAME !== undefined) cleanRoom.FLOOR_NAME = room.FLOOR_NAME;
      if (room.CONFERENCE_ID !== undefined) cleanRoom.CONFERENCE_ID = room.CONFERENCE_ID;
      if (room.CONFERENCE_NAME !== undefined) cleanRoom.CONFERENCE_NAME = room.CONFERENCE_NAME;

      // Parse features safely - handle Oracle Lob
      if (
        room.FEATURES &&
        typeof room.FEATURES === 'object' &&
        room.FEATURES.constructor &&
        room.FEATURES.constructor.name === 'Lob'
      ) {
        try {
          // Read the Lob content asynchronously
          const featuresString = await room.FEATURES.getData();
          if (featuresString && typeof featuresString === 'string') {
            const parsed = JSON.parse(featuresString);
            if (Array.isArray(parsed)) {
              cleanRoom.FEATURES = parsed.filter(item => typeof item === 'string' && item.trim());
            } else {
              cleanRoom.FEATURES = [];
            }
          } else {
            cleanRoom.FEATURES = [];
          }
        } catch (error) {
          console.warn('Failed to read Lob features:', error);
          cleanRoom.FEATURES = [];
        }
      } else {
        cleanRoom.FEATURES = parseFeatures(room.FEATURES);
      }

      return cleanRoom;
    });
  },
  async remove(id: number) {
    return withConn(async conn => {
      await conn.execute(`DELETE FROM ROOMS WHERE ID = :id`, { id }, { autoCommit: true });
    });
  },
};
