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

export const mrkdwnSectionForOption = (index: number, label: string): AnyBlock => ({
  type: 'section',
  text: {
    type: 'mrkdwn',
    text: `${index + 1}. ${label}`,
  },
});
