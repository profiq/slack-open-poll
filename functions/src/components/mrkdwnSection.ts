import { AnyBlock } from '@slack/types';

type MessageType = 'error' | 'confirmation' | 'loading' | 'default';

const messageMap: Record<MessageType, string> = {
  error: 'Something went wrong. Please try again.',
  confirmation: 'Your vote was recorded!',
  loading: 'Loading poll...',
  default: '',
};

export const mrkdwnSection = (type: MessageType, messageText?: string): AnyBlock => ({
  type: 'section',
  text: {
    type: 'mrkdwn',
    text: messageText ?? messageMap[type],
  },
});

export const pollHelpMessage = (): AnyBlock[] => [
  {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: '*How to use the `/poll` command:*',
    },
  },
  {
    type: 'divider',
  },
  {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: '• *Basic usage:*\n' + '`/poll "Your question?" option1, option2, option3`',
    },
  },
  {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: '• *Example:*\n' + '`/poll "What\'s your favorite color?" Red, Blue, Green`',
    },
  },
  {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text:
        '• *Example with separator between questions:*\n' +
        '`/poll "Your question?" option1, option2 question, option3 can have spaces`',
    },
  },
  {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: '• *Allow multiple selections:*\n' + '`/poll multiple "Your question?" option1, option2`',
    },
  },
  {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: '• *Limit number of selections:*\n' + '`/poll limit 2 "Your question?" option1, option2, option3`',
    },
  },
  {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text:
        '• *Add ability to add custom options:*\n' +
        '`/poll custom "Your question?" option1, option2, option3`\n' +
        'This creates a button that opens a form for adding options!',
    },
  },
  {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text:
        '*Notes:*\n' +
        '- You can combine the flags!\n' +
        '- You must provide at least 2 options.\n' +
        '- Maximum 10 options allowed.\n',
    },
  },
  {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text:
        '*More Information:*\n' +
        'For more information about viewing *your votes* or *poll settings* use: *`/poll info`*',
    },
  },
];

export const pollInfoMessage = (): AnyBlock[] => [
  {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: '*More Poll Features:*',
    },
  },
  {
    type: 'divider',
  },
  {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: 'By clicking the `Open` button you can see a form with 2 buttons:',
    },
  },
  {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: '• `Your Votes` - shows list of your own votes',
    },
  },
  {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text:
        '• `Settings` - *only for the poll creator*, ability to:\n' +
        '   - Close Poll - closes poll and *posts results* in thread\n' +
        '   - Delete Poll - deletes the poll message and the database instance',
    },
  },
];
