import { App, ExpressReceiver } from '@slack/bolt';
import config from './utils/config';
import { handlePollCommand } from './handlers/pollCreationHandler';
import { handleVoteAction } from './handlers/voteHandler';

const receiver = new ExpressReceiver({
  signingSecret: config.SLACK_SIGNING_SECRET,
  endpoints: '/events',
});

const app = new App({
  token: config.SLACK_BOT_TOKEN,
  receiver,
});

// this is not necessary for function, can be removed later
app.event('app_mention', async ({ event, say }) => {
  if ('text' in event && event.text.includes('hello')) {
    await say('OK');
  } else {
    await say('NOT OK');
  }
});

app.message('hello', async ({ message, say }) => {
  if (message.subtype === undefined || message.subtype === 'bot_message') {
    await say(`Hello <@${message.user}>!`);
  }
});

// Parses dynamic input, Creates a poll and Stores data in Firestore
app.command('/poll', handlePollCommand);

app.action(/^vote_.*/, handleVoteAction);

export const slackReceiver = receiver;
