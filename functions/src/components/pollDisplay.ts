import { AnyBlock } from '@slack/types';
import { Poll } from '../types/poll';
import { mrkdwnSection } from './mrkdwnSection';
import { button } from './button';

export const pollDisplayBlock = (poll: Poll | undefined, pollId: string): AnyBlock[] => {
  if (!poll) {
    return [mrkdwnSection('error')];
  }

  const formattedTime = `<!date^${Math.floor(new Date(poll.createdAt || Date.now()).getTime() / 1000)}^{date_long} at {time}|Created at: Unknown Date>`;

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

  const multiChoiceBlock: AnyBlock = {
    type: 'context',
    elements: [
      {
        type: 'mrkdwn',
        text: 'You can select all options',
      },
    ],
  };

  const maxVotesBlock: AnyBlock = {
    type: 'context',
    elements: [
      {
        type: 'mrkdwn',
        text: `You can select up to ${poll.maxVotes} options`,
      },
    ],
  };

  const customBlock: AnyBlock = {
    type: 'actions',
    elements: [
      {
        type: 'button',
        text: {
          type: 'plain_text',
          text: 'Add custom option',
          emoji: true,
        },
        action_id: 'open_custom_form',
        value: pollId,
      },
    ],
  };

  const openButtonBlock: AnyBlock = {
    type: 'actions',
    elements: [
      {
        type: 'button',
        text: {
          type: 'plain_text',
          text: 'Open',
          emoji: true,
        },
        style: 'primary',
        action_id: 'open_poll_form',
        value: pollId,
      },
    ],
  };

  const isClosedBlock: AnyBlock = {
    type: 'context',
    elements: [
      {
        type: 'mrkdwn',
        text: 'Voting has ended for this poll',
      },
    ],
  };

  const anonymousBlock: AnyBlock = {
    type: 'context',
    elements: [
      {
        type: 'mrkdwn',
        text: 'Votes are anonymous',
      },
    ],
  };

  const displayBlock: AnyBlock[] = [
    mrkdwnSection('default', poll.question),
    ...(poll.multiple ? [poll.maxVotes === 10 ? multiChoiceBlock : maxVotesBlock] : []),
    ...(poll.anonymous ? [anonymousBlock] : []),
    ...(poll.closed ? [{ type: 'divider ' }, isClosedBlock] : []),
    {
      type: 'divider',
    },
    ...poll.options
      .filter((option) => !option.deleted)
      .map((option, index) => {
        const votedUsers = poll.votes?.filter((vote) => vote.optionId === option.id);

        const userMentions = votedUsers?.map((vote) => `<@${vote.userId}>`) || [];
        const emoji = numberEmojis[index];

        const voteCount = votedUsers?.length ?? 0;

        let optionText = `${emoji} ${option.label}`;

        if (voteCount > 0) {
          optionText = `${emoji} ${option.label} \`${voteCount}\``;

          if (!poll.anonymous) {
            optionText = `${emoji} ${option.label} \`${voteCount}\` \n ${userMentions.join(' ')}`;
          }
        }

        return {
          ...mrkdwnSection('default', optionText),
          accessory: button(emoji, pollId, index, option.id),
        };
      }),
    ...(poll.custom ? [{ type: 'divider' }, customBlock] : []),
    openButtonBlock,
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
