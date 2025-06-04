import { AnyBlock } from '@slack/types';
import { Poll } from '../types/poll';
import { mrkdwnSection } from './mrkdwnSection';

export const pollResultBlock = (poll: Poll): AnyBlock[] => {
  const voteCounts = new Map<string, number>();

  for (const vote of poll.votes || []) {
    voteCounts.set(vote.optionId, (voteCounts.get(vote.optionId) || 0) + 1);
  }

  const totalUsersVoted = poll.votes ? new Set(poll.votes.map((vote) => vote.userId)).size : 0;
  const totalVotesCount = (poll.votes || []).length;
  const totalVotesText = `Total users voted: ${totalUsersVoted}, Total votes: ${totalVotesCount}`;

  const optionsWithCount = poll.options.map((option) => ({
    ...option,
    count: voteCounts.get(option.id) || 0,
  }));

  let maxVoteCount = 0;
  for (const option of optionsWithCount) {
    const count = option.count || 0;
    if (count > maxVoteCount) {
      maxVoteCount = count;
    }
  }

  const winners = optionsWithCount.filter((option) => option.count === maxVoteCount).map((option) => option.label);
  const voteWord = maxVoteCount === 1 ? 'vote' : 'votes';

  let winnerText = '';
  if (winners.length > 1) {
    winnerText = `*It's a tie!* ${winners.join(' and ')} with ${maxVoteCount} ${voteWord}`;
  } else if (winners.length === 1) {
    winnerText = `:tada: The winner is *${winners[0]}* with ${maxVoteCount} ${voteWord}! :tada:`;
  } else {
    winnerText = 'No votes were cast.';
  }

  const otherResults = optionsWithCount
    .filter((option) => !winners.includes(option.label))
    .map((option) => `${option.label}: ${option.count}`);

  const resultBlock: AnyBlock[] = [
    mrkdwnSection('default', `*Poll Results* for: *${poll.question}*`),
    mrkdwnSection('default', winnerText),
    {
      type: 'divider',
    },
    mrkdwnSection('default', 'Other options results:'),
    ...otherResults.map((text) => {
      const [label, count] = text.split(': ');
      return mrkdwnSection('default', `• ${label}: \`${count}\``);
    }),

    {
      type: 'divider',
    },
    mrkdwnSection('default', totalVotesText),
  ];

  return resultBlock;
};
