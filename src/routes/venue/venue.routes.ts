import { Router } from 'express';
import { auth } from '../../middlewares/auth';
import { rbac } from '../../middlewares/rbac';
import { audit } from '../../middlewares/audit';
import { floorsRepository } from '../../modules/venue/floors.repository';
import { roomsRepository } from '../../modules/venue/rooms.repository';

// Helper function to safely clean room data and remove circular references
function cleanRoomData(room: any) {
  // Create a completely new object to avoid any circular references
  const cleanRoom: any = {};

  // Safely extract each property with detailed logging
  const properties = [
    'ID',
    'FLOOR_ID',
    'NAME',
    'CAPACITY',
    'DESCRIPTION',
    'ROOM_TYPE',
    'STATUS',
    'FLOOR_NAME',
    'CONFERENCE_ID',
    'CONFERENCE_NAME',
  ];

  properties.forEach(prop => {
    if (room?.[prop] !== undefined) {
      const value = room[prop];

      // Only copy primitive values or safe arrays
      if (
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean' ||
        value === null
      ) {
        cleanRoom[prop] = value;
      } else if (Array.isArray(value)) {
        cleanRoom[prop] = [...value]; // Create a new array
      } else if (typeof value === 'object' && value !== null) {
        // Handle objects - convert to null to avoid React rendering issues
        console.warn(`Converting object property ${prop} to null:`, value);
        cleanRoom[prop] = null;
      } else {
        console.warn(`Skipping non-primitive property ${prop}:`, value);
        cleanRoom[prop] = null;
      }
    }
  });

  // Handle FEATURES array safely
  if (Array.isArray(room?.FEATURES)) {
    cleanRoom.FEATURES = [...room.FEATURES]; // Create a new array
  } else {
    cleanRoom.FEATURES = [];
  }

  return cleanRoom;
}

// Helper function to detect circular references
function hasCircularReference(obj: any, seen = new WeakSet()): boolean {
  if (obj === null || typeof obj !== 'object') {
    return false;
  }

  if (seen.has(obj)) {
    return true;
  }

  seen.add(obj);

  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      if (hasCircularReference(obj[key], seen)) {
        return true;
      }
    }
  }

  seen.delete(obj);
  return false;
}

// Deep clean function to remove all circular references
function deepClean(obj: any, seen = new WeakSet()): any {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (seen.has(obj)) {
    return '[Circular Reference]';
  }

  seen.add(obj);

  if (Array.isArray(obj)) {
    const result = obj.map(item => deepClean(item, seen));
    seen.delete(obj);
    return result;
  }

  const result: any = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      try {
        const cleanedValue = deepClean(obj[key], seen);
        // Only add non-empty objects or primitive values
        if (cleanedValue !== null && cleanedValue !== undefined) {
          if (typeof cleanedValue === 'object' && !Array.isArray(cleanedValue)) {
            // Check if object has any properties
            const hasProperties = Object.keys(cleanedValue).length > 0;
            if (hasProperties) {
              result[key] = cleanedValue;
            } else {
              result[key] = null; // Convert empty objects to null
            }
          } else {
            result[key] = cleanedValue;
          }
        } else {
          result[key] = null;
        }
      } catch (error) {
        result[key] = null; // Use null instead of '[Error]' for React compatibility
      }
    }
  }

  seen.delete(obj);
  return result;
}

export const venueRouter = Router();

// Test endpoint without auth
venueRouter.get('/test', (req, res) => {
  res.json({ message: 'Venue router is working!' });
});

// Debug endpoint to test room data cleaning
venueRouter.get('/debug-rooms', auth(), rbac('conferences.view'), async (req, res, next) => {
  try {
    console.log('Debug: Getting raw room data...');
    const rooms = await roomsRepository.listAll();
    console.log('Debug: Raw rooms count:', rooms?.length || 0);

    if (rooms && rooms.length > 0) {
      const firstRoom = rooms[0];
      console.log('Debug: First room structure:', {
        keys: Object.keys(firstRoom),
        hasCircular: hasCircularReference(firstRoom),
        roomType: typeof firstRoom,
        constructor: firstRoom?.constructor?.name,
      });

      // Test individual room cleaning
      try {
        const cleaned = cleanRoomData(firstRoom);
        console.log('Debug: Cleaned room:', cleaned);
        console.log('Debug: Cleaned room has circular:', hasCircularReference(cleaned));

        // Test JSON serialization
        try {
          JSON.stringify(cleaned);
          console.log('Debug: Individual room JSON serialization successful');
        } catch (jsonError) {
          console.error('Debug: Individual room JSON serialization failed:', jsonError);
        }
      } catch (cleanError) {
        console.error('Debug: Room cleaning failed:', cleanError);
      }
    }

    res.json({
      message: 'Debug completed - check server logs',
      roomCount: rooms?.length || 0,
      hasRooms: !!(rooms && rooms.length > 0),
    });
  } catch (e) {
    console.error('Debug error:', e);
    next(e);
  }
});

// Get all floors (for admin)
venueRouter.get('/floors', auth(), rbac('conferences.view'), async (req, res, next) => {
  try {
    console.log('Getting all floors...');
    const floors = await floorsRepository.listAll();
    console.log('Floors retrieved:', floors);
    res.json({ data: floors });
  } catch (e) {
    console.error('Error getting floors:', e);
    next(e);
  }
});

venueRouter.get(
  '/conferences/:confId/floors',
  auth(),
  rbac('conferences.view'),
  async (req, res, next) => {
    try {
      res.json({ data: await floorsRepository.list(Number(req.params.confId)) });
    } catch (e) {
      next(e);
    }
  }
);
venueRouter.post(
  '/conferences/:confId/floors',
  auth(),
  rbac('conferences.update'),
  audit('conference', 'floor-create', 'floor'),
  async (req, res, next) => {
    try {
      const id = await floorsRepository.create(Number(req.params.confId), req.body.floorNumber);
      res.status(201).json({ data: { id } });
    } catch (e) {
      next(e);
    }
  }
);
venueRouter.delete(
  '/floors/:id',
  auth(),
  rbac('conferences.update'),
  audit('conference', 'floor-delete', 'floor'),
  async (req, res, next) => {
    try {
      await floorsRepository.remove(Number(req.params.id));
      res.status(204).send();
    } catch (e) {
      next(e);
    }
  }
);

// Get all rooms (for admin)
venueRouter.get('/rooms', auth(), rbac('conferences.view'), async (req, res, next) => {
  try {
    console.log('Getting all rooms...');
    const rooms = await roomsRepository.listAll();
    console.log('Rooms retrieved:', rooms?.length || 0, 'rooms');

    // Clean the data to remove any circular references
    const cleanRooms =
      rooms?.map(room => {
        try {
          const cleaned = cleanRoomData(room);
          // Double-check for circular references
          if (hasCircularReference(cleaned)) {
            console.warn('Circular reference detected in cleaned room, using deep clean');
            return deepClean(room);
          }
          return cleaned;
        } catch (cleanError) {
          console.error('Error cleaning room data:', cleanError, 'Room:', room);
          // Use deep clean as fallback
          try {
            return deepClean(room);
          } catch (deepCleanError) {
            console.error('Deep clean also failed:', deepCleanError);
            // Return a safe fallback object
            return {
              ID: null,
              FLOOR_ID: null,
              NAME: 'Error loading room',
              CAPACITY: null,
              DESCRIPTION: null,
              ROOM_TYPE: null,
              FEATURES: [],
              FLOOR_NAME: null,
              CONFERENCE_ID: null,
              CONFERENCE_NAME: null,
            };
          }
        }
      }) || [];

    console.log('Cleaned rooms count:', cleanRooms.length);

    // Final validation to ensure React compatibility
    const finalRooms = cleanRooms.map(room => {
      const finalRoom: any = {};
      Object.keys(room).forEach(key => {
        const value = room[key];
        if (value === null || value === undefined) {
          finalRoom[key] = null;
        } else if (typeof value === 'object' && !Array.isArray(value)) {
          // Convert any remaining objects to null
          finalRoom[key] = null;
        } else {
          finalRoom[key] = value;
        }
      });
      return finalRoom;
    });

    console.log('Final rooms validation completed');

    // Test JSON serialization before sending
    try {
      console.log('Testing JSON serialization...');
      const testString = JSON.stringify(finalRooms);
      console.log('JSON serialization successful, length:', testString.length);
      res.json({ data: finalRooms });
    } catch (jsonError) {
      console.error('JSON serialization error:', jsonError);
      console.error('Error details:', {
        message: (jsonError as Error).message,
        stack: (jsonError as Error).stack,
        finalRoomsLength: finalRooms.length,
        firstRoom: finalRooms[0] ? Object.keys(finalRooms[0]) : 'none',
      });

      // Try to identify which room is causing the issue
      for (let i = 0; i < finalRooms.length; i++) {
        try {
          JSON.stringify(finalRooms[i]);
        } catch (roomError) {
          console.error(`Room at index ${i} causes serialization error:`, roomError);
          console.error('Problematic room:', finalRooms[i]);
        }
      }

      res.status(500).json({
        error: 'Data serialization error',
        message: 'Unable to serialize room data to JSON',
      });
    }
  } catch (e) {
    console.error('Error getting rooms:', e);
    next(e);
  }
});

// Get room by ID
venueRouter.get('/rooms/:id', auth(), rbac('conferences.view'), async (req, res, next) => {
  try {
    const room = await roomsRepository.getById(Number(req.params.id));
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Clean the data to remove any circular references
    let cleanRoom;
    try {
      cleanRoom = cleanRoomData(room);
    } catch (cleanError) {
      console.error('Error cleaning room data:', cleanError, 'Room:', room);
      return res.status(500).json({
        error: 'Data processing error',
        message: 'Unable to process room data',
      });
    }

    // Test JSON serialization before sending
    try {
      JSON.stringify(cleanRoom);
      return res.json({ data: cleanRoom });
    } catch (jsonError) {
      console.error('JSON serialization error:', jsonError);
      return res.status(500).json({
        error: 'Data serialization error',
        message: 'Unable to serialize room data to JSON',
      });
    }
  } catch (e) {
    console.error('Error getting room:', e);
    return next(e);
  }
});

venueRouter.get(
  '/floors/:floorId/rooms',
  auth(),
  rbac('conferences.view'),
  async (req, res, next) => {
    try {
      res.json({ data: await roomsRepository.list(Number(req.params.floorId)) });
    } catch (e) {
      next(e);
    }
  }
);
venueRouter.post(
  '/floors/:floorId/rooms',
  auth(),
  rbac('conferences.update'),
  audit('conference', 'room-create', 'room'),
  async (req, res, next) => {
    try {
      const id = await roomsRepository.create(
        Number(req.params.floorId),
        req.body.name,
        req.body.capacity,
        req.body.description,
        req.body.roomType,
        req.body.features,
        req.body.status
      );
      res.status(201).json({ data: { id } });
    } catch (e) {
      next(e);
    }
  }
);
venueRouter.put(
  '/rooms/:id',
  auth(),
  rbac('conferences.update'),
  audit('conference', 'room-update', 'room'),
  async (req, res, next) => {
    try {
      await roomsRepository.update(
        Number(req.params.id),
        req.body.name,
        req.body.capacity,
        req.body.description,
        req.body.roomType,
        req.body.features,
        req.body.status
      );
      res.status(200).json({ success: true });
    } catch (e) {
      next(e);
    }
  }
);
venueRouter.delete(
  '/rooms/:id',
  auth(),
  rbac('conferences.update'),
  audit('conference', 'room-delete', 'room'),
  async (req, res, next) => {
    try {
      await roomsRepository.remove(Number(req.params.id));
      res.status(204).send();
    } catch (e) {
      next(e);
    }
  }
);
