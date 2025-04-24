import { AnyBlock } from '@slack/types';
import { Poll } from '../types/poll';
import { mrkdwnSection, mrkdwnSectionForOption } from './mrkdwnSection';
import { button } from './button';

export const pollDisplayBlock = (poll: Poll | undefined, pollId: string): AnyBlock[] => {
  if (!poll) {
    return [mrkdwnSection('error')];
  }

  const formattedTime = `<!date^${Math.floor(new Date(poll.channelTimeStamp || Date.now()).getTime() / 1000)}^{date_long} at {time}|Created at: Unknown Date>`;

  const displayBlock: AnyBlock[] = [
    mrkdwnSection('default', poll.question),
    {
      type: 'divider',
    },
    ...poll.options.map((option, index) => ({
      ...mrkdwnSectionForOption(index, option.label),
      accessory: button('Vote', pollId, index, option.id),
    })),
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `Created by <@${poll.createdBy}> on ${formattedTime}`,
        },
      ],
    },
  ];

  return displayBlock;
};
