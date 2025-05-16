import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handlePollCommand } from '../handlers/pollCreationHandler';
import { PollService } from '../services/pollService';
import { AllMiddlewareArgs, SlackCommandMiddlewareArgs } from '@slack/bolt';
import { AnyBlock } from '@slack/types';
import { pollDisplayBlock } from '../components/pollDisplay';
import { WebClient } from '@slack/web-api';

vi.mock('../services/pollService');
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
        text: 'Invalid format. Use: /poll "Your question?" option1, option2, ...',
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
        text: 'An error occurrred',
      })
    );
  });

  it('sets multiple to true if parsedInt > 10 and keeps maxVotes 10', async () => {
    const text = 'limit 13 "Question" apple, banana, pear';

    const mockGet = vi.fn().mockResolvedValue({
      data: () => ({
        question: 'Question',
        options: [
          { id: '1', label: 'apple' },
          { id: '2', label: 'banana' },
          { id: '3', label: 'pear' },
        ],
        multiple: true,
        maxVotes: 1,
      }),
      id: 'mockPollId',
    });

    const mockCreate = vi.fn().mockResolvedValue({
      get: mockGet,
      update: vi.fn().mockResolvedValue(undefined),
    });
    PollService.prototype.create = mockCreate;

    vi.mocked(pollDisplayBlock).mockReturnValue([
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: 'Poll: Question',
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
    } as SlackCommandMiddlewareArgs & AllMiddlewareArgs);

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        question: 'Question',
        options: [
          { id: expect.stringMatching(/.+/), label: 'apple' },
          { id: expect.stringMatching(/.+/), label: 'banana' },
          { id: expect.stringMatching(/.+/), label: 'pear' },
        ],
        multiple: true,
        maxVotes: 1,
      })
    );

    expect(mockPostMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: baseCommand.command!.channel_id,
        text: `Poll: Question`,
        blocks: expect.arrayContaining([]),
      })
    );
  });
});
