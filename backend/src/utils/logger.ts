// =============================================================================
// PrintShop Management System — Logger Utility
// =============================================================================
// Lightweight structured logger. In production, swap the internals for a
// library like Winston or Pino without changing the import API.
// =============================================================================

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

const isDevelopment = process.env.NODE_ENV !== 'production';

const colors: Record<LogLevel, string> = {
  info:  '\x1b[36m',  // Cyan
  warn:  '\x1b[33m',  // Yellow
  error: '\x1b[31m',  // Red
  debug: '\x1b[35m',  // Magenta
};
const reset = '\x1b[0m';

function log(level: LogLevel, message: string, meta?: unknown): void {
  if (level === 'debug' && !isDevelopment) return;

  const timestamp = new Date().toISOString();
  const color = colors[level];
  const prefix = `${color}[${level.toUpperCase()}]${reset} ${timestamp}`;

  if (meta !== undefined) {
    console[level === 'error' ? 'error' : 'log'](`${prefix} — ${message}`, meta);
  } else {
    console[level === 'error' ? 'error' : 'log'](`${prefix} — ${message}`);
  }
}

export const logger = {
  info:  (msg: string, meta?: unknown) => log('info',  msg, meta),
  warn:  (msg: string, meta?: unknown) => log('warn',  msg, meta),
  error: (msg: string, meta?: unknown) => log('error', msg, meta),
  debug: (msg: string, meta?: unknown) => log('debug', msg, meta),
};

export default logger;
