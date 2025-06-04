import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleClosePoll } from '../handlers/pollCloseHandler';
import type { SlackActionMiddlewareArgs, BlockAction, ButtonAction, App } from '@slack/bolt';
import { PollService } from '../services/pollService';
import { pollResultBlock } from '../components/pollResult';
import { pollDisplayBlock } from '../components/pollDisplay';
import { WebClient } from '@slack/web-api';

vi.mock('../services/pollService');
vi.mock('../components/pollResult', () => ({
  pollResultBlock: vi.fn(() => [{ type: 'section', text: { type: 'mrkdwn', text: 'Results' } }]),
}));
vi.mock('../components/pollDisplay', () => ({
  pollDisplayBlock: vi.fn(() => [{ type: 'section', text: { type: 'mrkdwn', text: 'Poll Display' } }]),
}));
const mockLoggerError = vi.fn();
vi.mock('../utils/logger', () => ({
  Logger: vi.fn(() => ({
    withContext: vi.fn().mockReturnThis(),
    error: mockLoggerError,
  })),
}));

const mockAck = vi.fn();
const mockPostMessage = vi.fn();
const mockChatUpdate = vi.fn();

const mockClient = {
  chat: {
    postMessage: mockPostMessage,
    update: mockChatUpdate,
  },
} as unknown as WebClient;

beforeEach(() => {
  vi.clearAllMocks();
});

const baseArgs: SlackActionMiddlewareArgs<BlockAction> & { client: WebClient } = {
  ack: mockAck,
  client: mockClient,
  action: {
    type: 'button',
    action_id: 'close_poll',
    block_id: 'block123',
    text: { type: 'plain_text', text: 'Close' },
    value: 'poll123',
    action_ts: '1234567890.123456',
  },
  body: {
    type: 'block_actions',
    user: { id: 'U123', username: '', name: '', team_id: '' },
    actions: [],
    team: { id: 'T123', domain: 'example' },
    token: '',
    api_app_id: '',
    trigger_id: '',
    container: { type: 'message', message_ts: '123.456', channel_id: 'C123' },
    response_url: '',
  },
  payload: {
    type: 'button',
    action_id: 'close_poll',
    block_id: 'block123',
    text: { type: 'plain_text', text: 'Close' },
    value: 'poll123',
    action_ts: '1234567890.123456',
  },
  respond: vi.fn(),
  say: vi.fn(),
};

describe('handleClosePoll', () => {
  it('acks immediately', async () => {
    vi.spyOn(PollService.prototype, 'getById').mockResolvedValueOnce({
      createdBy: 'U123',
      closed: true,
      channelId: '',
      channelTimeStamp: '',
      question: '',
      options: [],
      createdAt: '',
    });

    await handleClosePoll(baseArgs);
    expect(mockAck).toHaveBeenCalled();
  });

  it('logs error if poll ID missing', async () => {
    const argsWithNoPollId = {
      ...baseArgs,
      action: { ...baseArgs.action, value: '' },
    };

    await handleClosePoll(argsWithNoPollId);

    expect(mockLoggerError).toHaveBeenCalledWith('Missing poll ID');
  });

  it('logs error if poll not found', async () => {
    vi.spyOn(PollService.prototype, 'getById').mockResolvedValue(undefined);

    await handleClosePoll(baseArgs);

    expect(mockLoggerError).toHaveBeenCalledWith('Poll not found');
  });

  it('updates poll if not already closed and posts results and updates display', async () => {
    const initialPoll = {
      id: 'poll123',
      createdBy: 'U123',
      closed: false,
      question: 'Favorite color?',
      channelId: 'C123',
      channelTimeStamp: '123.456',
      options: [],
      createdAt: '',
    };

    const updatedPoll = { ...initialPoll, closed: true };

    const getById = vi.spyOn(PollService.prototype, 'getById');
    getById.mockResolvedValueOnce(initialPoll).mockResolvedValueOnce(updatedPoll);

    const updateMock = vi.spyOn(PollService.prototype, 'update').mockResolvedValue({} as FirebaseFirestore.WriteResult);

    await handleClosePoll(baseArgs);

    expect(updateMock).toHaveBeenCalledWith('poll123', { closed: true });

    expect(pollResultBlock).toHaveBeenCalledWith(updatedPoll);
    expect(pollDisplayBlock).toHaveBeenCalledWith(updatedPoll, 'poll123');

    expect(mockPostMessage).toHaveBeenCalledWith({
      channel: 'C123',
      thread_ts: '123.456',
      text: 'POLL RESULTS!',
      blocks: expect.anything(),
    });

    expect(mockChatUpdate).toHaveBeenCalledWith({
      channel: 'C123',
      ts: '123.456',
      text: 'Poll: Favorite color?',
      blocks: expect.anything(),
    });
  });

  it('logs error if updated poll not found', async () => {
    const pollId = 'poll123';

    vi.spyOn(PollService.prototype, 'getById')
      .mockResolvedValueOnce({
        createdBy: 'U123',
        closed: false,
        question: 'Question?',
        options: [],
        channelId: 'C123',
        channelTimeStamp: '123.456',
        createdAt: '',
      })
      .mockResolvedValueOnce(undefined);

    vi.spyOn(PollService.prototype, 'update').mockResolvedValue({} as FirebaseFirestore.WriteResult);

    const baseArgs = {
      ack: vi.fn(),
      client: {
        chat: {
          postMessage: vi.fn(),
          update: vi.fn(),
        },
      },
      action: { value: pollId } as ButtonAction,
    } as unknown as SlackActionMiddlewareArgs<BlockAction> & { client: App['client'] };

    await handleClosePoll(baseArgs);

    expect(mockLoggerError).toHaveBeenCalledWith('Updated poll not found');
  });

  it('logs error if poll missing channelId or channelTimeStamp', async () => {
    const pollWithoutChannelInfo = {
      id: 'poll123',
      createdBy: 'U123',
      closed: false,
      question: 'Any question?',
      options: [],
      createdAt: '',
      channelId: '',
      channelTimeStamp: '',
    };

    vi.spyOn(PollService.prototype, 'getById')
      .mockResolvedValueOnce(pollWithoutChannelInfo)
      .mockResolvedValueOnce(pollWithoutChannelInfo);

    await handleClosePoll(baseArgs);

    expect(mockLoggerError).toHaveBeenCalledWith('Poll is missing channel id or channel timestamp');
  });

  it('logs error if thrown during execution', async () => {
    vi.spyOn(PollService.prototype, 'getById').mockRejectedValueOnce(new Error('Failed!'));

    await handleClosePoll(baseArgs);

    expect(mockLoggerError).toHaveBeenCalledWith('Error: Failed!');
  });

  it('returns early if poll was already closed', async () => {
    const closedPoll = {
      id: 'poll123',
      createdBy: 'U123',
      closed: true,
      question: 'Already closed?',
      options: [],
      createdAt: '',
      channelId: 'C123',
      channelTimeStamp: '123.456',
    };

    const getById = vi.spyOn(PollService.prototype, 'getById').mockResolvedValueOnce(closedPoll);
    const updateSpy = vi.spyOn(PollService.prototype, 'update');

    await handleClosePoll(baseArgs);

    expect(getById).toHaveBeenCalledTimes(1);
    expect(updateSpy).not.toHaveBeenCalled();
    expect(mockPostMessage).not.toHaveBeenCalled();
    expect(mockChatUpdate).not.toHaveBeenCalled();
  });
});
