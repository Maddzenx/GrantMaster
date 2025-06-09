import { logInfo, logWarn, logError } from '../lib/log';

logInfo('Test info log from development', { test: true, env: process.env.NODE_ENV });
logWarn('Test warning log from development', { test: true, env: process.env.NODE_ENV });
logError('Test error log from development', { test: true, env: process.env.NODE_ENV });

// Give Logtail time to flush before exit
setTimeout(() => process.exit(0), 1000); 