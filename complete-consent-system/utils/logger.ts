export const logger = {
  info: (message: string, data?: any) => {
    console.log(`[INFO] ${message}`, data);
  },
  error: (message: string, error?: any) => {
    console.error(`[ERROR] ${message}`, error);
  },
  warn: (message: string, data?: any) => {
    console.warn(`[WARN] ${message}`, data);
  },
  debug: (message: string, data?: any) => {
    console.debug(`[DEBUG] ${message}`, data);
  }
};

export const generateSignedUrl = (url: string): string => {
  // Simple URL signing - in production you might want more security
  const timestamp = Date.now();
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}t=${timestamp}`;
};