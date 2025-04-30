import { AnyBlock } from '@slack/types';
import { Poll } from '../types/poll';
import { mrkdwnSection } from './mrkdwnSection';
import { button } from './button';

export const pollDisplayBlock = (poll: Poll | undefined, pollId: string): AnyBlock[] => {
  if (!poll) {
    return [mrkdwnSection('error')];
  }

  const formattedTime = `<!date^${Math.floor(new Date(poll.channelTimeStamp || Date.now()).getTime() / 1000)}^{date_long} at {time}|Created at: Unknown Date>`;
  const numberEmojis = [
    ':one:',
    ':two:',
    ':three:',
    ':four:',
    ':five:',
    ':six:',
    ':seven:',
    ':eight:',
    ':nine:',
    ':keycap_ten:',
  ];

  const displayBlock: AnyBlock[] = [
    mrkdwnSection('default', poll.question),
    {
      type: 'divider',
    },
    ...poll.options.map((option, index) => {
      const votedUsers = poll.votes?.filter((vote) => vote.optionId === option.id);

      const userMentions = votedUsers?.map((vote) => `<@${vote.userId}>`) || [];
      const emoji = numberEmojis[index];

      const voteCount = votedUsers?.length ?? 0;

      let optionText = `${emoji} ${option.label} \n ${userMentions.join(' ')}`;
      if (voteCount > 0) {
        optionText = `${emoji} ${option.label} \`${voteCount}\` \n ${userMentions.join(' ')}`;
      }

      return {
        ...mrkdwnSection('default', optionText),
        accessory: button(emoji, pollId, index, option.id),
      };
    }),
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
