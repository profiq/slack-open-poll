import { describe, it, expect } from 'vitest';
import { pollDisplayBlock } from '../components/pollDisplay';
import { Poll } from '../types/poll';

describe('PollDisplayBlock', () => {
  const mockPoll: Poll = {
    question: 'How are you?',
    options: [
      { label: 'Good', id: '1' },
      { label: 'Bad', id: '2' },
    ],
    createdBy: 'U123456',
    channelId: 'C123456',
    channelTimeStamp: new Date('2025-04-22T10:00:00Z').toISOString(),
  };

  const pollId = 'P123456';

  it('should include the poll question', () => {
    const blocks = pollDisplayBlock(mockPoll, pollId);
    const questionBlock = blocks.find(
      (block) => block.type === 'section' && 'text' in block && block.text?.text?.includes(mockPoll.question)
    );

    expect(questionBlock).toBeDefined();
  });

  it('should include vote buttons for each option', () => {
    const blocks = pollDisplayBlock(mockPoll, pollId);
    const voteLines = blocks.filter(
      (block) =>
        block.type === 'section' &&
        'text' in block &&
        mockPoll.options.some((opt) => block.text?.text?.includes(opt.label))
    );

    expect(voteLines.length).toBe(mockPoll.options.length);
  });
});
