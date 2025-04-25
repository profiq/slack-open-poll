import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handlePollCommand } from '../handlers/pollCreationHandler';
import { PollService } from '../services/pollService';
import { AllMiddlewareArgs, SlackCommandMiddlewareArgs } from '@slack/bolt';
import { AnyBlock } from '@slack/types';
import { pollDisplayBlock } from '../components/pollDisplay';

vi.mock('../services/pollService)');
vi.mock('../components/pollDisplay');

const mockRespond = vi.fn();
const mockAck = vi.fn();

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
    });

    expect(mockRespond).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining('Invalid format'),
        response_type: 'ephemeral',
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
    });

    expect(mockRespond).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining('at least 2 options'),
        response_type: 'ephemeral',
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
    });

    expect(mockRespond).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining('up to 10 options'),
        response_type: 'ephemeral',
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
    });

    expect(mockCreate).toHaveBeenCalled();
    expect(mockGet).toHaveBeenCalled();
    expect(mockRespond).toHaveBeenCalledWith({
      response_type: 'in_channel',
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
    });

    expect(mockRespond).toHaveBeenCalledWith(
      expect.objectContaining({
        response_type: 'ephemeral',
        blocks: expect.arrayContaining([
          expect.objectContaining({
            type: 'section',
            text: expect.objectContaining({
              type: 'mrkdwn',
              text: expect.stringContaining('Error'),
            }),
          }),
        ]),
        text: 'An error occurrred',
      })
    );
  });
});
