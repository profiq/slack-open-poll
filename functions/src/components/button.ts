import { Button as SlackButton } from '@slack/types';

export const button = (text: string, pollId: string, optionIndex: number, optionId: string): SlackButton => ({
  type: 'button',
  text: {
    type: 'plain_text',
    text,
    emoji: true,
  },
  value: JSON.stringify({ pollId, optionIndex, optionId }),
  action_id: `vote_${pollId}_${optionIndex}`,
});
