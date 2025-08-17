// Security-conscious logging utility
// Replaces console.log statements to prevent sensitive data exposure

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableStorage: boolean;
}

// Default configuration - production-safe
const DEFAULT_CONFIG: LogConfig = {
  level: 'warn',
  enableConsole: false, // Disable console logging in production
  enableStorage: false, // Could be enabled for audit logging if needed
};

class Logger {
  private config: LogConfig;

  constructor(config: Partial<LogConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.config.level);
    const messageIndex = levels.indexOf(level);
    return messageIndex >= currentLevelIndex;
  }

  private sanitizeData(data: any): any {
    if (typeof data === 'string') {
      // Remove potential sensitive patterns
      return data
        .replace(/signature_data|signatureData/gi, '[SIGNATURE_REDACTED]')
        .replace(/token|jwt|auth/gi, '[TOKEN_REDACTED]')
        .replace(/password|pwd/gi, '[PASSWORD_REDACTED]')
        .replace(/email.*@.*\./gi, '[EMAIL_REDACTED]')
        .replace(/\d{4,}/g, '[NUMBERS_REDACTED]'); // Document numbers, phones
    }
    
    if (typeof data === 'object' && data !== null) {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(data)) {
        if (key.toLowerCase().includes('signature') || 
            key.toLowerCase().includes('token') ||
            key.toLowerCase().includes('password') ||
            key.toLowerCase().includes('auth')) {
          sanitized[key] = '[REDACTED]';
        } else {
          sanitized[key] = this.sanitizeData(value);
        }
      }
      return sanitized;
    }
    
    return data;
  }

  private log(level: LogLevel, message: string, data?: any): void {
    if (!this.shouldLog(level)) return;

    const timestamp = new Date().toISOString();
    const sanitizedData = data ? this.sanitizeData(data) : undefined;
    
    if (this.config.enableConsole) {
      const logMethod = console[level] || console.log;
      if (sanitizedData) {
        logMethod(`[${timestamp}] ${message}`, sanitizedData);
      } else {
        logMethod(`[${timestamp}] ${message}`);
      }
    }

    // Store logs securely if needed (could integrate with audit system)
    if (this.config.enableStorage) {
      // This could be expanded to send to secure logging service
      // For now, we'll skip storage to prevent any security issues
    }
  }

  debug(message: string, data?: any): void {
    this.log('debug', message, data);
  }

  info(message: string, data?: any): void {
    this.log('info', message, data);
  }

  warn(message: string, data?: any): void {
    this.log('warn', message, data);
  }

  error(message: string, data?: any): void {
    this.log('error', message, data);
  }
}

// Create singleton instance with development vs production configs
const isDevelopment = window.location.hostname === 'localhost' || 
                     window.location.hostname.includes('lovable');

export const logger = new Logger({
  level: isDevelopment ? 'debug' : 'error',
  enableConsole: isDevelopment, // Only log to console in development
  enableStorage: false, // Disabled for security
});

// Legacy console replacement for gradual migration
export const secureLog = {
  debug: (message: string, data?: any) => logger.debug(message, data),
  info: (message: string, data?: any) => logger.info(message, data),
  warn: (message: string, data?: any) => logger.warn(message, data),
  error: (message: string, data?: any) => logger.error(message, data),
  
  // Legacy method names for compatibility
  log: (message: string, data?: any) => logger.info(message, data),
};