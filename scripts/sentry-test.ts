import * as Sentry from '@sentry/node';

console.log('SENTRY_DSN:', process.env.SENTRY_DSN);

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});

Sentry.captureException(new Error('Manual Sentry test error'));

setTimeout(() => process.exit(0), 1000); 