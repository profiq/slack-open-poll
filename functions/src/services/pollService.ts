import { FirestoreService } from './firestoreService';
import { Poll, Vote } from '../types/poll';

export class PollService extends FirestoreService<Poll> {
  constructor() {
    super('polls');
  }

  async vote(pollId: string, vote: Vote): Promise<void> {
    await this.runTransaction(async (transaction) => {
      const poll = await this.getInTransaction(transaction, pollId);

      if (!poll) {
        throw new Error(`Poll with ID ${pollId} not found`);
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
