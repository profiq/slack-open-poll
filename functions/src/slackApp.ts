import { App, ExpressReceiver } from '@slack/bolt';
import { AnyBlock } from '@slack/types';
import config from './utils/config';
import { PollService } from './services/pollService';

import { pollDisplayBlock } from './components/pollDisplay';
import { mrkdwnSection } from './components/mrkdwnSection';

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

// Format: /poll "Question" "," list of options separated by ","
app.command('/poll', async ({ command, ack, respond }) => {
  await ack();

  const polls = new PollService();
  // Create a test poll using a Poll service
  try {
    const pollRef = await polls.create({
      question: 'How are you?',
      options: [
        { label: 'Good', id: '1' },
        { label: 'Bad', id: '2' },
      ],
      createdBy: command.user_id,
      channelId: command.channel_id,
    });
    console.log(pollRef);

    // Working usage of creating the poll above in Slack using /poll command
    const pollSnap = await pollRef.get();
    const poll = pollSnap.data();

    if (poll) {
      const blocks: AnyBlock[] = pollDisplayBlock(poll, pollSnap.id);

      await respond({
        response_type: 'in_channel',
        blocks,
      });
    } else {
      await respond({
        response_type: 'ephemeral',
        text: 'Something went wrong with creating the poll',
      });
    }
  } catch (error) {
    console.error('Error creating poll', error);
    await respond({
      response_type: 'ephemeral',
      blocks: [mrkdwnSection('error')],
    });
  }
});

export const slackReceiver = receiver;
