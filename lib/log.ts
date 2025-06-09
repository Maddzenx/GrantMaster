import { Logtail } from '@logtail/node';
import * as Sentry from '@sentry/node';

// Set your Logtail source token in an environment variable for security
const logtail = new Logtail(process.env.LOGTAIL_SOURCE_TOKEN || 'YOUR_LOGTAIL_SOURCE_TOKEN');

// Initialize Sentry for error alerting (set SENTRY_DSN in your .env file)
// Sentry.init is safe to call multiple times; it will not re-initialize if already set up
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});

type LogLevel = 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: any;
}

function log(level: LogLevel, message: string, context?: LogContext) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...context,
  };
  // Output as JSON for easy parsing by log management tools
  if (level === 'error') {
    console.error(JSON.stringify(logEntry));
  } else if (level === 'warn') {
    console.warn(JSON.stringify(logEntry));
  } else {
    console.log(JSON.stringify(logEntry));
  }
}

export function logInfo(message: string, context: any = {}) {
  logtail.info(message, context);
  console.log(JSON.stringify({ level: 'info', message, ...context }));
}

export function logWarn(message: string, context: any = {}) {
  logtail.warn(message, context);
  console.warn(JSON.stringify({ level: 'warn', message, ...context }));
}

export function logError(message: string, context: any = {}) {
  Sentry.captureException(new Error(message), { extra: context });
  logtail.error(message, context);
  console.error(JSON.stringify({ level: 'error', message, ...context }));
}

// Ensure logs are flushed before process exit (for serverless reliability)
process.on('beforeExit', async () => {
  await logtail.flush();
}); 