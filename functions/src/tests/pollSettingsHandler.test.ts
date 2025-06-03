import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handlePollSettingsButton } from '../handlers/pollSettingsHandler';
import type { SlackActionMiddlewareArgs, BlockAction, BlockElementAction, RespondFn, SayFn } from '@slack/bolt';
import { WebClient } from '@slack/web-api';
import { PollService } from '../services/pollService';

vi.mock('../services/pollService');

const mockAck = vi.fn();
const mockUpdate = vi.fn();

const mockClient = {
  views: {
    update: mockUpdate,
  },
} as unknown as WebClient;

const mockLoggerError = vi.fn();
vi.mock('../utils/logger', () => {
  return {
    Logger: vi.fn(() => ({
      withContext: vi.fn().mockReturnThis(),
      error: mockLoggerError,
    })),
  };
});

const actionPayload: BlockElementAction = {
  type: 'button',
  action_id: 'poll_settings_button',
  block_id: 'block123',
  text: { type: 'plain_text', text: 'Settings' },
  value: 'poll123',
  action_ts: '1234567890.123456',
};

const mockRespond: RespondFn = vi.fn();
const mockSay: SayFn = vi.fn();

const baseArgs: SlackActionMiddlewareArgs<BlockAction<BlockElementAction>> & {
  client: typeof mockClient;
  payload: BlockElementAction;
  ack: typeof mockAck;
  respond: RespondFn;
} = {
  ack: mockAck,
  client: mockClient,
  action: actionPayload,
  payload: actionPayload,
  respond: mockRespond,
  say: mockSay,
  body: {
    type: 'block_actions',
    trigger_id: 'trigger123',
    user: {
      id: 'U123',
      username: 'someusername',
      team_id: 'T123',
    },
    team: {
      id: 'T123',
      domain: 'teamdomain',
    },
    api_app_id: 'A123',
    token: 'token',
    container: {
      type: 'message',
      message_ts: '123.456',
      channel_id: 'C123',
      is_ephemeral: false,
    },
    channel: {
      id: 'C123',
      name: 'general',
    },
    response_url: 'response_url',
    actions: [actionPayload],
    view: {
      id: 'view123',
      type: 'modal',
      callback_id: 'poll_settings_modal',
      team_id: 'T123',
      app_id: 'A123',
      bot_id: 'B123',
      root_view_id: null,
      external_id: '',
      app_installed_team_id: 'T123',
      hash: 'hash',
      state: { values: {} },
      title: { type: 'plain_text', text: 'Poll Settings' },
      blocks: [],
      private_metadata: '',
      submit: { type: 'plain_text', text: 'Submit' },
      clear_on_close: false,
      notify_on_close: false,
      close: { type: 'plain_text', text: 'Close' },
      previous_view_id: null,
    },
  },
};

describe('handlePollSettingsButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.spyOn(PollService.prototype, 'getById').mockResolvedValue({
      createdBy: 'U123',
      question: 'q',
      options: [],
      createdAt: String(new Date()),
      channelTimeStamp: '',
      channelId: '',
    });
  });

  it('acknowledges the action', async () => {
    await handlePollSettingsButton(baseArgs);
    expect(mockAck).toHaveBeenCalled();
  });

  it('calls views.update to update modal', async () => {
    await handlePollSettingsButton(baseArgs);
    expect(mockUpdate).toHaveBeenCalled();
  });

  it('logs error if poll ID is missing', async () => {
    const argsWithoutPollId = {
      ...baseArgs,
      action: { ...baseArgs.action, value: '' },
      payload: { ...baseArgs.payload, value: '' },
      body: {
        ...baseArgs.body,
        actions: [{ ...baseArgs.body.actions[0], value: '' }],
      },
    };

    await handlePollSettingsButton(argsWithoutPollId);
    expect(mockAck).toHaveBeenCalled();
    expect(mockLoggerError).toHaveBeenCalledWith('Poll ID is missing');
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});
