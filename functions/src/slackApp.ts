import { App, ExpressReceiver } from '@slack/bolt';
import { AnyBlock } from '@slack/types';
import config from './config';

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

  const text = command.text || '';

  const parts = text.split(',').map((str) => str.trim());

  // TODO: add check if it is the right format

  const question = parts[0];
  const options = parts.slice(1);

  const blocks: AnyBlock[] = [];

  blocks.push({
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: `*${question}*`,
    },
  });

  blocks.push({ type: 'divider' });

  for (let i = 0; i < options.length; i++) {
    const option = options[i];

    blocks.push({
      type: 'section',
      text: {
        type: 'plain_text',
        text: option,
      },
      accessory: {
        type: 'button',
        text: {
          type: 'plain_text',
          text: 'Vote',
        },
        action_id: i.toString(),
      },
    });
  }

  blocks.push({ type: 'divider' });

  blocks.push({
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: `Poll created by *<@${command.user_id}>*`,
    },
  });

  await respond({
    response_type: 'in_channel',
    blocks,
  });
});

export const slackReceiver = receiver;
