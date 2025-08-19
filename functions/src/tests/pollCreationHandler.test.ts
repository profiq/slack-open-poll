import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AllMiddlewareArgs, SlackCommandMiddlewareArgs } from '@slack/bolt';
import { AnyBlock } from '@slack/types';
import { WebClient } from '@slack/web-api';
import { firebaseMockFactory, createLoggerMockFactory } from './mocks/commonMocks';

// Hoist firebase mock to avoid real initialization
vi.mock('../firebase', () => firebaseMockFactory());

// Mock Logger
vi.mock('../utils/logger', () => createLoggerMockFactory());

// Import modules under test
import { handlePollCommand, parseCommand } from '../handlers/pollCreationHandler';
import { PollService } from '../services/pollService';
import { pollDisplayBlock } from '../components/pollDisplay';

vi.mock('../components/pollDisplay');

const mockPostEphemeral = vi.fn();
const mockPostMessage = vi.fn();

const mockClient = {
  chat: {
    postEphemeral: mockPostEphemeral,
    postMessage: mockPostMessage,
    update: vi.fn(),
  },
  conversations: {
    history: vi.fn(),
  },
} as unknown as WebClient;

const mockAck = vi.fn();
const mockRespond = vi.fn();

const baseCommand = {
  command: {
    text: '',
    user_id: 'U123456',
    channel_id: 'C123456',
  },
  ack: mockAck,
  respond: mockRespond,
} as unknown as SlackCommandMiddlewareArgs & AllMiddlewareArgs;

describe('handlePollCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('responds with error if format is invalid', async () => {
    await handlePollCommand({
      ...baseCommand,
      command: {
        ...baseCommand.command,
        text: 'Invalid format',
      },
      client: mockClient,
    });

    expect(mockPostEphemeral).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: baseCommand.command.channel_id,
        user: baseCommand.command.user_id,
        text: 'Invalid format. Please use quotes around your question and provide at least 2 options. Example: /poll "Your question?" option1, option2, ...',
      })
    );
  });

  it('responds with error if less than 2 options', async () => {
    const text = '"HeyHo" One option';
    await handlePollCommand({
      ...baseCommand,
      command: {
        ...baseCommand.command,
        text,
      },
      client: mockClient,
    });

    expect(mockPostEphemeral).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: baseCommand.command.channel_id,
        user: baseCommand.command.user_id,
        text: 'Please provide at least 2 options.',
      })
    );
  });

  it('responds with error if more than 10 options', async () => {
    const text = '"HeyHo" one, two, three, four, five, six, seven, eight, nine, ten, eleven';
    await handlePollCommand({
      ...baseCommand,
      command: {
        ...baseCommand.command,
        text,
      },
      client: mockClient,
    });

    expect(mockPostEphemeral).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: baseCommand.command.channel_id,
        user: baseCommand.command.user_id,
        text: 'You can only provide up to 10 options.',
      })
    );
  });

  it('creates poll and responds with poll block', async () => {
    const text = '"Are you hungry?" YES, Not really, Just a little bit';

    const mockGet = vi.fn().mockResolvedValue({
      data: () => ({
        question: 'Are you hungry?',
        options: [
          { id: '1', label: 'YES' },
          { id: '2', label: 'Not really' },
          { id: '3', label: 'Just a little bit' },
        ],
      }),
    });

    const mockCreate = vi.fn().mockResolvedValue({ get: mockGet });

    PollService.prototype.create = mockCreate;

    vi.mocked(pollDisplayBlock).mockReturnValue([
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: 'Poll: Are you hungry?',
        },
      },
    ] as AnyBlock[]);

    await handlePollCommand({
      ...baseCommand,
      command: {
        ...baseCommand.command,
        text,
      },
      client: mockClient,
    });

    expect(mockCreate).toHaveBeenCalled();
    expect(mockGet).toHaveBeenCalled();
    expect(mockPostMessage).toHaveBeenCalledWith({
      channel: baseCommand.command.channel_id,
      text: `Poll: Are you hungry?`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: 'Poll: Are you hungry?',
          },
        },
      ] as AnyBlock[],
    });
  });

  it('responds with error if poll creation fails', async () => {
    const text = '"Are you hungry?" YES, Not really, Just a little bit';

    const mockCreate = vi.fn().mockRejectedValue(new Error('something broke'));

    PollService.prototype.create = mockCreate;

    await handlePollCommand({
      ...baseCommand,
      command: { ...baseCommand.command, text },
      client: mockClient,
    });

    expect(mockPostEphemeral).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: baseCommand.command.channel_id,
        user: baseCommand.command.user_id,
        text: 'An error occurred',
      })
    );
  });

  it('throws error for limit > 10', async () => {
    const text = 'limit 13 "Question" apple, banana, pear';

    await handlePollCommand({
      ...baseCommand,
      command: {
        ...baseCommand.command,
        text,
      },
      client: mockClient,
    } as SlackCommandMiddlewareArgs & AllMiddlewareArgs);

    expect(mockPostEphemeral).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: baseCommand.command.channel_id,
        user: baseCommand.command.user_id,
        text: 'Invalid limit. Please provide a number between 2 and 10.',
      })
    );
    expect(mockPostMessage).not.toHaveBeenCalled();
  });
});

describe('parseCommand', () => {
  describe('Quote handling', () => {
    it('should parse command with regular double quotes', async () => {
      const result = await parseCommand('"What is your favorite color?" Red, Blue, Green');
      expect(result).toEqual({
        question: 'What is your favorite color?',
        options: ['Red', 'Blue', 'Green'],
        flags: [],
        multiple: false,
        maxVotes: 1,
        custom: false,
        anonymous: false,
        help: false,
        info: false,
        create: false,
      });
    });

    it('should parse command with smart quotes', async () => {
      const result = await parseCommand('"What is your favorite color?" Red, Blue, Green');
      expect(result).toEqual({
        question: 'What is your favorite color?',
        options: ['Red', 'Blue', 'Green'],
        flags: [],
        multiple: false,
        maxVotes: 1,
        custom: false,
        anonymous: false,
        help: false,
        info: false,
        create: false,
      });
    });

    it('should parse command with mixed quote types', async () => {
      const result = await parseCommand('"What is your favorite color?" Red, Blue, Green');
      expect(result).toEqual({
        question: 'What is your favorite color?',
        options: ['Red', 'Blue', 'Green'],
        flags: [],
        multiple: false,
        maxVotes: 1,
        custom: false,
        anonymous: false,
        help: false,
        info: false,
        create: false,
      });
    });

    it('should parse command with single quotes', async () => {
      const result = await parseCommand("'What is your favorite color?' Red, Blue, Green");
      expect(result).toEqual({
        question: 'What is your favorite color?',
        options: ['Red', 'Blue', 'Green'],
        flags: [],
        multiple: false,
        maxVotes: 1,
        custom: false,
        anonymous: false,
        help: false,
        info: false,
        create: false,
      });
    });

    it('should parse command with smart single quotes', async () => {
      const result = await parseCommand('\u2018What is your favorite color?\u2019 Red, Blue, Green');
      expect(result).toEqual({
        question: 'What is your favorite color?',
        options: ['Red', 'Blue', 'Green'],
        flags: [],
        multiple: false,
        maxVotes: 1,
        custom: false,
        anonymous: false,
        help: false,
        info: false,
        create: false,
      });
    });

    it('should return null for command without quotes', async () => {
      const result = await parseCommand('What is your favorite color Red, Blue, Green');
      expect(result).toBeNull();
    });

    it('should return null for command with unclosed quotes', async () => {
      const result = await parseCommand('"What is your favorite color Red, Blue, Green');
      expect(result).toBeNull();
    });
  });

  describe('Flag parsing', () => {
    it('should parse multiple flag', async () => {
      const result = await parseCommand('multiple "What are your hobbies?" Reading, Gaming, Sports');
      expect(result?.multiple).toBe(true);
      expect(result?.maxVotes).toBe(10);
    });

    it('should parse custom flag', async () => {
      const result = await parseCommand('custom "Your choice?" Option1, Option2');
      expect(result?.custom).toBe(true);
    });

    it('should parse anonymous flag', async () => {
      const result = await parseCommand('anonymous "Anonymous poll?" Option1, Option2');
      expect(result?.anonymous).toBe(true);
    });

    it('should parse limit with valid number', async () => {
      const result = await parseCommand('limit 3 "Pick your top 3?" Option1, Option2, Option3, Option4');
      expect(result?.multiple).toBe(true);
      expect(result?.maxVotes).toBe(3);
    });

    it('should parse multiple flags together', async () => {
      const result = await parseCommand('multiple custom anonymous limit 2 "Complex poll?" Option1, Option2, Option3');
      expect(result?.multiple).toBe(true);
      expect(result?.custom).toBe(true);
      expect(result?.anonymous).toBe(true);
      expect(result?.maxVotes).toBe(2);
    });

    it('should handle invalid limit values by throwing error', async () => {
      await expect(parseCommand('limit 15 "Question?" Option1, Option2')).rejects.toThrow(
        'Invalid limit. Please provide a number between 2 and 10.'
      );
    });

    it('should ignore non-numeric limit values', async () => {
      const result = await parseCommand('limit abc "Question?" Option1, Option2');
      expect(result?.multiple).toBe(false);
      expect(result?.maxVotes).toBe(1);
    });

    it('should set maxVotes to 1 for non-multiple polls', async () => {
      const result = await parseCommand('"Simple poll?" Option1, Option2');
      expect(result?.multiple).toBe(false);
      expect(result?.maxVotes).toBe(1);
    });

    it('should set maxVotes to 10 for multiple polls without limit', async () => {
      const result = await parseCommand('multiple "Multiple poll?" Option1, Option2, Option3');
      expect(result?.multiple).toBe(true);
      expect(result?.maxVotes).toBe(10);
    });
  });

  describe('Special commands', () => {
    it('should handle help command', async () => {
      const result = await parseCommand('help');
      expect(result?.help).toBe(true);
      expect(result?.info).toBe(false);
      expect(result?.create).toBe(false);
    });

    it('should handle info command', async () => {
      const result = await parseCommand('info');
      expect(result?.info).toBe(true);
      expect(result?.help).toBe(false);
      expect(result?.create).toBe(false);
    });

    it('should handle create command', async () => {
      const result = await parseCommand('create');
      expect(result?.create).toBe(true);
      expect(result?.help).toBe(false);
      expect(result?.info).toBe(false);
    });
  });

  describe('Validation', () => {
    it('should return null for empty question', async () => {
      const result = await parseCommand('"" Option1, Option2');
      expect(result).toBeNull();
    });

    it('should parse command with less than 2 options (validation handled by main handler)', async () => {
      const result = await parseCommand('"Question?" OnlyOne');
      expect(result).toEqual({
        question: 'Question?',
        options: ['OnlyOne'],
        flags: [],
        multiple: false,
        maxVotes: 1,
        custom: false,
        anonymous: false,
        help: false,
        info: false,
        create: false,
      });
    });

    it('should parse command with more than 10 options (validation handled by main handler)', async () => {
      const result = await parseCommand(
        '"Question?" One, Two, Three, Four, Five, Six, Seven, Eight, Nine, Ten, Eleven'
      );
      expect(result).toEqual({
        question: 'Question?',
        options: ['One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven'],
        flags: [],
        multiple: false,
        maxVotes: 1,
        custom: false,
        anonymous: false,
        help: false,
        info: false,
        create: false,
      });
    });
  });
});
