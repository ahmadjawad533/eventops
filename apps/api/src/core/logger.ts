type LogLevel = 'info' | 'warn' | 'error' | 'debug';

function log(level: LogLevel, message: string, meta?: any) {
  const timestamp = new Date().toISOString();
  const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;

  if (level === 'error') {
    console.error(`${prefix} ${message}${metaStr}`);
  } else if (level === 'warn') {
    console.warn(`${prefix} ${message}${metaStr}`);
  } else if (level === 'debug') {
    if (process.env.DEBUG || process.env.NODE_ENV === 'development') {
      console.debug(`${prefix} ${message}${metaStr}`);
    }
  } else {
    console.log(`${prefix} ${message}${metaStr}`);
  }
}

export const logger = {
  info: (msg: string, meta?: any) => log('info', msg, meta),
  warn: (msg: string, meta?: any) => log('warn', msg, meta),
  error: (msg: string, meta?: any) => log('error', msg, meta),
  debug: (msg: string, meta?: any) => log('debug', msg, meta),
};
