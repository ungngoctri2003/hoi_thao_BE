export function ok<T>(data: T, meta?: Record<string, unknown>) {
  return { data, ...(meta ? { meta } : {}) };
}

export function err(code: string, message: string, details?: Record<string, unknown>) {
  return { error: { code, message, ...(details ? { details } : {}) } };
}

/**
 * Safely serialize data to JSON, handling circular references
 * @param data The data to serialize
 * @returns JSON string or null if serialization fails
 */
export function safeJsonStringify(data: any): string | null {
  try {
    return JSON.stringify(data);
  } catch (error) {
    console.error('JSON serialization error:', error);
    return null;
  }
}

/**
 * Create a clean object with only serializable properties
 * @param obj The object to clean
 * @param allowedKeys Optional array of allowed keys
 * @param visited Set to track visited objects to prevent circular references
 * @returns Clean object without circular references
 */
export function cleanObject(obj: any, allowedKeys?: string[], visited = new WeakSet()): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj !== 'object') {
    return obj;
  }

  // Check for circular reference
  if (visited.has(obj)) {
    return '[Circular Reference]';
  }

  // Add current object to visited set
  visited.add(obj);

  if (Array.isArray(obj)) {
    const result = obj.map(item => cleanObject(item, allowedKeys, visited));
    visited.delete(obj);
    return result;
  }

  const cleaned: any = {};
  const keys = allowedKeys || Object.keys(obj);

  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];
      if (value !== null && typeof value === 'object' && !(value instanceof Date)) {
        cleaned[key] = cleanObject(value, allowedKeys, visited);
      } else {
        cleaned[key] = value;
      }
    }
  }

  // Remove from visited set when done
  visited.delete(obj);
  return cleaned;
}
