import { App, ExpressReceiver } from '@slack/bolt';
import config from './utils/config';
import { handlePollCommand } from './handlers/pollCreationHandler';
import { handleVoteAction } from './handlers/voteHandler';
import { handleFormCreation } from './handlers/customFormHandler';
import { handleCustomOptionSubmit } from './handlers/customOptionSubmitHandler';
import { handleOpenButton } from './handlers/openButtonHandler';
import { handleUserVotesButton } from './handlers/userVotesButtonHandler';

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

// Handles clicking vote button, adds increments vote count for clicked option and updates Slack message
app.action(/^vote_.*/, handleVoteAction);

// Opens form when button for adding custom option clicked
app.action('open_custom_form', handleFormCreation);

// Submits the option given in form, stores option in Firestore and updates Slack message
app.view('custom_option_submit', handleCustomOptionSubmit);

// Opens form that has buttons for voted options and poll settings
app.action('open_poll_form', handleOpenButton);

// Opens form that shows user's votes
app.action('your_votes', handleUserVotesButton);

export const slackReceiver = receiver;
