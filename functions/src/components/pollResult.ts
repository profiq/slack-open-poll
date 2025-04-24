import { AnyBlock } from '@slack/types';
import { Poll } from '../types/poll';
import { mrkdwnSection } from './mrkdwnSection';

export const pollResultBlock = (poll: Poll): AnyBlock[] => {
  const pollCreatedText = `Poll created by ${poll.createdBy} on <!date^${Math.floor(
    new Date(poll.channelTimeStamp || Date.now()).getTime() / 1000
  )}^{date_long} at {time}|Created at: Unknown Date>`;

  const resultBlock: AnyBlock[] = [
    mrkdwnSection('default', `Poll results:\n"${poll.question}"`),
    ...poll.options.map((option, index) =>
      mrkdwnSection('default', `${index + 1}. ${option.label} - ${option.count || 0} votes`)
    ),
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: pollCreatedText,
        },
      ],
    },
  ];

  return resultBlock;
};
