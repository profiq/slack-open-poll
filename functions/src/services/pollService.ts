import { FirestoreService } from './firestoreService';
import { Poll, Vote } from '../types/poll';
import { Logger } from '../utils/logger';

export class PollService extends FirestoreService<Poll> {
  constructor() {
    super('polls');
  }

  async vote(pollId: string, vote: Vote): Promise<void> {
    await this.runTransaction(async (transaction) => {
      const log = new Logger({
        functionName: 'pollService',
      });

      const poll = await this.getInTransaction(transaction, pollId);

      if (!poll) {
        log.error('Poll with the ID not found', { pollId });
        throw new Error(`Poll with ID ${pollId} not found`);
      }

      if (poll.closed) {
        throw new Error('Poll is closed');
      }

      const votes = poll.votes || [];
      const isMultiple = poll.multiple === true;
      const userVotes = votes.filter((v) => v.userId === vote.userId);

      // if multiple choice, check if the vote option existed, then either remove it or create a new vote
      if (isMultiple) {
        const hasVotedForThisOption = userVotes.some((v) => v.optionId === vote.optionId);

        if (hasVotedForThisOption) {
          // vote already existed
          const updatedVotes = votes.filter((v) => !(v.userId === vote.userId && v.optionId === vote.optionId));

          this.updateInTransaction(transaction, pollId, { votes: updatedVotes });
        } else {
          const maxVotes = poll.maxVotes ?? 1;

          if (userVotes.length >= maxVotes) {
            log.warn('User has already reached max votes', { userId: vote.userId });
            throw new Error(`You can only vote for up to ${maxVotes} option${maxVotes > 1 ? 's' : ''}.`);
          }

          votes.push(vote);
          this.updateInTransaction(transaction, pollId, { votes });
        }
      } else {
        // is single choice
        const existingVote = userVotes.length > 0;

        if (existingVote) {
          const existingVoteOption = userVotes[0].optionId;

          if (existingVoteOption === vote.optionId) {
            // remove the same vote
            const updatedVotes = votes.filter((v) => v.userId !== vote.userId);
            this.updateInTransaction(transaction, pollId, { votes: updatedVotes });
          } else {
            // change the vote for new one
            const updatedVotes = votes.filter((v) => v.userId !== vote.userId);
            updatedVotes.push(vote);

            this.updateInTransaction(transaction, pollId, { votes: updatedVotes });
          }
        } else {
          // add first vote
          votes.push(vote);

          this.updateInTransaction(transaction, pollId, { votes });
        }
      }
    });
  }
}
