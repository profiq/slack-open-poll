import { onRequest, HttpsOptions } from 'firebase-functions/v2/https';
import { slackReceiver } from './slackApp.js';
import config from './utils/config';

const FunctionHttpsOptions: HttpsOptions = {
  region: config.DEFAULT_FUNCTIONS_LOCATION,
  maxInstances: 1,
  concurrency: 250,
  timeoutSeconds: 60,
  cpu: 1,
  memory: '256MiB',
  invoker: 'public',
};

export const slack = onRequest(FunctionHttpsOptions, slackReceiver.app);
