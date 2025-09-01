export function ok<T>(data: T, meta?: any) {
  return { data, ...(meta ? { meta } : {}) };
}

export function err(code: string, message: string, details?: any) {
  return { error: { code, message, ...(details ? { details } : {}) } };
}





