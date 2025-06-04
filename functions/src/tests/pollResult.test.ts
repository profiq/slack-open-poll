import { describe, it, expect } from 'vitest';
import { pollResultBlock } from '../components/pollResult';
import { Poll } from '../types/poll';

describe('PollResultBlock', () => {
  const basePoll: Poll = {
    question: 'How are you?',
    options: [
      { label: 'Good', id: '1' },
      { label: 'Bad', id: '2' },
    ],
    createdAt: '2023-01-01T00:00:00.000Z',
    createdBy: 'U123456',
    channelId: 'C123456',
    channelTimeStamp: new Date('2025-04-22T10:00:00Z').toISOString(),
  };

  it('should include a "Poll Results" heading', () => {
    const blocks = pollResultBlock(basePoll);
    const heading = blocks.find(
      (block) => block.type === 'section' && 'text' in block && block.text?.text?.includes('*Poll Results*')
    );
    expect(heading).toBeDefined();
  });

  it('should display the winner with vote count', () => {
    const poll: Poll = {
      ...basePoll,
      votes: [
        { userId: 'U1', optionId: '2' },
        { userId: 'U2', optionId: '2' },
      ],
    };

    const blocks = pollResultBlock(poll);
    const winnerBlock = blocks.find(
      (block) =>
        block.type === 'section' && 'text' in block && block.text?.text?.includes('The winner is *Bad* with 2 votes!')
    );

    expect(winnerBlock).toBeDefined();
  });

  it('should display the vote counts for other options', () => {
    const poll: Poll = {
      ...basePoll,
      votes: [
        { userId: 'U1', optionId: '1' },
        { userId: 'U2', optionId: '2' },
        { userId: 'U3', optionId: '2' },
      ],
    };

    const blocks = pollResultBlock(poll);

    const otherOptionBlock = blocks.find(
      (block): block is { type: 'section'; text: { type: 'mrkdwn'; text: string } } =>
        block.type === 'section' &&
        'text' in block &&
        typeof block.text === 'object' &&
        block.text.type === 'mrkdwn' &&
        block.text.text === '• Good: `1`'
    );

    expect(otherOptionBlock).toBeDefined();
  });

  it('should display total votes and users', () => {
    const poll: Poll = {
      ...basePoll,
      votes: [
        { userId: 'U1', optionId: '1' },
        { userId: 'U2', optionId: '2' },
        { userId: 'U3', optionId: '2' },
      ],
    };

    const blocks = pollResultBlock(poll);
    const totalVotesBlock = blocks.find(
      (block) =>
        block.type === 'section' &&
        'text' in block &&
        block.text?.text?.includes('Total users voted: 3') &&
        block.text?.text?.includes('Total votes: 3')
    );
    expect(totalVotesBlock).toBeDefined();
  });

  it('should display a tie when vote counts match', () => {
    const poll: Poll = {
      ...basePoll,
      options: [
        { label: 'Option A', id: '1' },
        { label: 'Option B', id: '2' },
      ],
      votes: [
        { userId: 'U1', optionId: '1' },
        { userId: 'U2', optionId: '2' },
      ],
    };

    const blocks = pollResultBlock(poll);
    const tieBlock = blocks.find(
      (block) =>
        block.type === 'section' &&
        'text' in block &&
        block.text?.text?.includes("*It's a tie!*") &&
        block.text?.text?.includes('Option A and Option B with 1 vote')
    );

    expect(tieBlock).toBeDefined();
  });
});
