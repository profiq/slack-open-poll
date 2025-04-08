import { onRequest } from 'firebase-functions/v2/https';
import { slackReceiver } from './slackApp.js';

export const slack = onRequest(slackReceiver.app);
