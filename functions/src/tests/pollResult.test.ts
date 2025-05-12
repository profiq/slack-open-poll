import { describe, it, expect } from 'vitest';
import { pollResultBlock } from '../components/pollResult';
import { Poll } from '../types/poll';
import { SectionBlock, Block } from '@slack/types';

describe('PollResultBlock', () => {
  const mockPoll: Poll = {
    question: 'How are you?',
    options: [
      { label: 'Good', id: '1', count: 1 },
      { label: 'Bad', id: '2', count: 42 },
    ],
    createdAt: '2023-01-01T00:00:00.000Z',
    createdBy: 'U123456',
    channelId: 'C123456',
    channelTimeStamp: new Date('2025-04-22T10:00:00Z').toISOString(),
  };

  it('should display the poll question with results', () => {
    const blocks = pollResultBlock(mockPoll);
    const resultBlock = blocks.find(
      (block) =>
        block.type === 'section' &&
        'text' in block &&
        block.text?.text?.includes(`Poll results:\n"${mockPoll.question}"`)
    );

    expect(resultBlock).toBeDefined();
  });

  it('should display the vote counts for each option', () => {
    const blocks = pollResultBlock(mockPoll);
    const resultSections = blocks.filter(
      (block) =>
        block.type === 'section' &&
        'text' in block &&
        mockPoll.options.some((option) => block.text?.text?.includes(option.label))
    );

    expect(resultSections.length).toBe(mockPoll.options.length);

    mockPoll.options.forEach((option, index) => {
      const section = resultSections[index];
      if (isSectionBlock(section)) {
        expect(section.text?.text).toContain(`${option.count} votes`);
      } else {
        throw new Error('Section block does not contain text property');
      }
    });
  });
});

function isSectionBlock(block: Block): block is SectionBlock {
  return block.type === 'section' && 'text' in block;
}
