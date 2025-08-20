import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SlackActionMiddlewareArgs, BlockAction, ButtonAction } from '@slack/bolt';
import { WebClient } from '@slack/web-api';
import { firebaseMockFactory, createLoggerMockFactory } from './mocks/commonMocks';

const { mockLoggerError } = vi.hoisted(() => ({ mockLoggerError: vi.fn() }));

// Hoist mocks BEFORE importing modules under test
vi.mock('../firebase', () => firebaseMockFactory());
vi.mock('../utils/logger', () => createLoggerMockFactory({ error: mockLoggerError }));

// Import modules under test
import { handleDeletePoll } from '../handlers/pollDeleteHandler';
import { PollService } from '../services/pollService';

const mockAck = vi.fn();
const mockChatDelete = vi.fn();
const mockViewsUpdate = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
});

const mockClient = {
  chat: {
    delete: mockChatDelete,
  },
  views: {
    update: mockViewsUpdate,
  },
  conversations: {
    history: vi.fn(),
  },
} as unknown as WebClient;

const baseArgs = {
  ack: mockAck,
  client: mockClient,
  action: {
    type: 'button',
    action_id: 'delete_poll',
    block_id: 'block123',
    text: { type: 'plain_text', text: 'Delete' },
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
    container: { type: 'view', view_id: 'view123' },
    view: {
      id: 'view123',
      type: 'modal',
      callback_id: 'poll_settings_modal',
      title: { type: 'plain_text', text: 'Poll Settings' },
      blocks: [],
      private_metadata: '',
      close: { type: 'plain_text', text: 'Close' },
      submit: { type: 'plain_text', text: 'Submit' },
      state: { values: {} },
      hash: '',
      app_id: '',
      bot_id: '',
      team_id: 'T123',
      clear_on_close: false,
      notify_on_close: false,
      previous_view_id: null,
      root_view_id: null,
    },
    response_url: '',
  },
  payload: {
    type: 'button',
    action_id: 'delete_poll',
    block_id: 'block123',
    text: { type: 'plain_text', text: 'Delete' },
    value: 'poll123',
    action_ts: '1234567890.123456',
  },
  respond: vi.fn(),
  say: vi.fn(),
} as SlackActionMiddlewareArgs<BlockAction<ButtonAction>> & { client: WebClient };

describe('handleDeletePoll', () => {
  it('calls ack immediately', async () => {
    vi.spyOn(PollService.prototype, 'getById').mockResolvedValue({
      createdBy: 'U123',
      channelId: 'C123',
      channelTimeStamp: '123.456',
      question: '',
      options: [],
      createdAt: '',
    });
    vi.spyOn(PollService.prototype, 'delete').mockResolvedValue({
      id: 'poll123',
      deleted: true,
    });

    await handleDeletePoll(baseArgs);

    expect(mockAck).toHaveBeenCalled();
  });

  it('deletes chat message and poll and updates modal on success', async () => {
    vi.spyOn(PollService.prototype, 'getById').mockResolvedValue({
      createdBy: 'U123',
      channelId: 'C123',
      channelTimeStamp: '123.456',
      question: '',
      options: [],
      createdAt: '',
    });
    vi.spyOn(PollService.prototype, 'delete').mockResolvedValue({
      id: 'poll123',
      deleted: true,
    });

    await handleDeletePoll(baseArgs);

    expect(mockChatDelete).toHaveBeenCalledWith({
      channel: 'C123',
      ts: '123.456',
    });

    expect(PollService.prototype.delete).toHaveBeenCalledWith('poll123');

    expect(mockViewsUpdate).toHaveBeenCalledWith({
      view_id: 'view123',
      view: expect.objectContaining({
        type: 'modal',
        title: expect.objectContaining({ text: 'Poll Deleted' }),
      }),
    });

    expect(mockLoggerError).not.toHaveBeenCalled();
  });

  it('logs error and throws if poll ID missing', async () => {
    const argsMissingPollId = {
      ...baseArgs,
      action: { ...baseArgs.action, value: '' },
    };

    await handleDeletePoll(argsMissingPollId);

    expect(mockAck).toHaveBeenCalled();
    expect(mockLoggerError).toHaveBeenCalledWith('Missing poll ID');
    expect(mockChatDelete).not.toHaveBeenCalled();
    expect(mockViewsUpdate).not.toHaveBeenCalled();
  });

  it('logs error and throws if poll ID missing', async () => {
    const argsMissingPollId = {
      ...baseArgs,
      action: { ...baseArgs.action, value: '' },
    };

    await handleDeletePoll(argsMissingPollId);

    expect(mockAck).toHaveBeenCalled();
    expect(mockLoggerError).toHaveBeenCalledWith('Missing poll ID');
    expect(mockChatDelete).not.toHaveBeenCalled();
    expect(mockViewsUpdate).not.toHaveBeenCalled();
  });

  it('logs error if poll missing channelId or channelTimeStamp but still deletes poll and updates modal', async () => {
    vi.spyOn(PollService.prototype, 'getById').mockResolvedValue({
      createdBy: 'U123',
      question: '',
      options: [],
      createdAt: '',
      channelId: '',
      channelTimeStamp: '',
    });
    vi.spyOn(PollService.prototype, 'delete').mockResolvedValue({
      id: 'poll123',
      deleted: true,
    });

    await handleDeletePoll(baseArgs);

    expect(mockLoggerError).toHaveBeenCalledWith('Poll is missing channelId or channelTimeStamp for deletion');
    expect(mockChatDelete).not.toHaveBeenCalled();
    expect(PollService.prototype.delete).toHaveBeenCalledWith('poll123');
    expect(mockViewsUpdate).toHaveBeenCalled();
  });
});
