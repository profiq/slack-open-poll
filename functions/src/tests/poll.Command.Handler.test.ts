import { AllMiddlewareArgs, SlackCommandMiddlewareArgs } from '@slack/bolt';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PollService } from '../services/pollService';
import { pollDisplayBlock } from '../components/pollDisplay';
import { handlePollCommand } from '../handlers/pollCreationHandler';

vi.mock('../services/pollService');
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

  it('creates poll and responds with the correct poll block', async () => {
    const text = '"Are you hungry?" Yes, No';

    const mockGet = vi.fn().mockResolvedValue({
      data: () => ({
        question: 'Are you hungry?',
        options: [
          { id: '1', label: 'Yes' },
          { id: '2', label: 'No' },
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
    ]);

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
      ],
    });
  });

  it('responds with error if poll creation fails', async () => {
    const text = '"Are you hungry?" YES, Not really, Just a little bit';

    const mockCreate = vi.fn().mockRejectedValue(new Error('Poll creation failed'));

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
              text: expect.stringContaining('Error: Poll creation failed'),
            }),
          }),
        ]),
        text: 'An error occurrred',
      })
    );
  });

  it('responds with error if more than 10 options are provided', async () => {
    const text =
      '"What is your favorite fruit?" Apple, Banana, Cherry, Grape, Orange, Pineapple, Mango, Pear, Kiwi, Plum, Watermelon';

    await handlePollCommand({
      ...baseCommand,
      command: {
        ...baseCommand.command,
        text,
      },
    });

    expect(mockRespond).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining('You can only provide up to 10 options'),
        response_type: 'ephemeral',
      })
    );
  });
});
