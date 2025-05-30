import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleUserVotesButton } from '../handlers/userVotesButtonHandler';
import { PollService } from '../services/pollService';
import type { View } from '@slack/types';
import type { SlackActionMiddlewareArgs, BlockAction, BlockElementAction } from '@slack/bolt';
import { Poll } from '../types/poll';
import { WebClient } from '@slack/web-api';

vi.mock('../services/pollService');

const mockAck = vi.fn();
const mockUpdate = vi.fn();
const mockRespond = vi.fn();
const mockSay = vi.fn();

const mockClient = {
  views: {
    update: mockUpdate,
  },
} as unknown as WebClient;

const mockPoll: Poll = {
  question: 'What is your favorite color?',
  options: [
    { id: '1', label: 'Red' },
    { id: '2', label: 'Blue' },
  ],
  votes: [
    { userId: 'U123', optionId: '1' },
    { userId: 'U123', optionId: '2' },
  ],
  channelId: 'C123',
  channelTimeStamp: '123.456',
  createdBy: 'U123',
  createdAt: new Date().toISOString(),
};

const actionPayload: BlockElementAction = {
  type: 'button',
  action_id: 'user_votes_button',
  block_id: 'block123',
  text: {
    type: 'plain_text',
    text: 'View my votes',
    emoji: false,
  },
  value: 'poll123',
  action_ts: '123.456',
};

const baseArgs: SlackActionMiddlewareArgs<BlockAction> & {
  client: typeof mockClient;
  payload: BlockElementAction;
  respond: typeof mockRespond;
  say: typeof mockSay;
} = {
  ack: mockAck,
  client: mockClient,
  action: actionPayload,
  body: {
    type: 'block_actions',
    user: {
      id: 'U123',
      username: 'user',
      team_id: 'T123',
    },
    trigger_id: 'trigger123',
    view: {
      id: 'view123',
      team_id: 'T123',
      type: 'modal',
      hash: 'hash123',
      app_id: 'A123',
      bot_id: 'B123',
      blocks: [],
      private_metadata: '',
      root_view_id: null,
      previous_view_id: null,
      clear_on_close: false,
      notify_on_close: false,
      callback_id: 'callback',
      title: { type: 'plain_text', text: 'Your votes' },
      close: { type: 'plain_text', text: 'Close' },
      submit: null,
      state: { values: {} },
      external_id: undefined,
    },
    team: {
      id: 'T123',
      domain: 'domain',
    },
    api_app_id: 'A123',
    token: 'token123',
    container: {
      type: 'message',
      message_ts: '123.456',
      channel_id: 'C123',
      is_ephemeral: false,
    },
    channel: {
      id: 'C123',
      name: 'channel-name',
    },
    response_url: 'response_url',
    actions: [],
  },
  payload: actionPayload,
  respond: mockRespond,
  say: mockSay,
};

describe('handleUserVotesButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should acknowledge and show modal with user votes', async () => {
    vi.mocked(PollService.prototype.getById).mockResolvedValueOnce(mockPoll);

    await handleUserVotesButton(baseArgs);

    expect(mockAck).toHaveBeenCalled();

    const expectedView: View = {
      type: 'modal',
      callback_id: 'user_votes_modal',
      title: {
        type: 'plain_text',
        text: 'Your votes',
      },
      close: {
        type: 'plain_text',
        text: 'Close',
      },
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `Poll: ${mockPoll.question}`,
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '- Red\n- Blue',
          },
        },
      ],
    };

    expect(mockUpdate).toHaveBeenCalledWith({
      view_id: 'view123',
      view: expectedView,
    });
  });

  it('should handle case when poll is not found', async () => {
    vi.mocked(PollService.prototype.getById).mockResolvedValueOnce(undefined);

    await handleUserVotesButton(baseArgs);

    expect(mockAck).toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockRespond).not.toHaveBeenCalled();
  });

  it('should handle poll with no votes', async () => {
    const noVotesPoll: Poll = {
      ...mockPoll,
      votes: [],
    };

    vi.mocked(PollService.prototype.getById).mockResolvedValueOnce(noVotesPoll);

    await handleUserVotesButton(baseArgs);

    expect(mockAck).toHaveBeenCalled();

    const expectedView: View = {
      type: 'modal',
      callback_id: 'user_votes_modal',
      title: {
        type: 'plain_text',
        text: 'Your votes',
      },
      close: {
        type: 'plain_text',
        text: 'Close',
      },
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `Poll: ${noVotesPoll.question}`,
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: 'You have not voted yet',
          },
        },
      ],
    };

    expect(mockUpdate).toHaveBeenCalledWith({
      view_id: 'view123',
      view: expectedView,
    });
  });
});
