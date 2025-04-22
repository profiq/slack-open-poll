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
      const voteIndex = votes.findIndex((v) => v.userId === vote.userId);

      if (voteIndex !== -1) {
        // If user clicks the same option again, remove the vote
        if (votes[voteIndex].optionId === vote.optionId) {
          votes.splice(voteIndex, 1);
        } else {
          // Otherwise, update to new option
          votes[voteIndex] = vote;
        }
      } else {
        // Add new vote
        votes.push(vote);
      }

      this.updateInTransaction(transaction, pollId, { votes });
    });
  }
}
