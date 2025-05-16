import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleVoteAction } from '../handlers/voteHandler';
import { PollService } from '../services/pollService';
import { SlackAction } from '@slack/bolt';
import { pollDisplayBlock } from '../components/pollDisplay';
import { WebClient } from '@slack/web-api';

vi.mock('../services/pollService');
vi.mock('../components/pollDisplay');

const mockPostMessage = vi.fn();
const mockUpdateMessage = vi.fn();
const mockPostEphemeral = vi.fn();

const mockClient = {
  chat: {
    postEphemeral: mockPostEphemeral,
    postMessage: mockPostMessage,
    update: mockUpdateMessage,
  },
  conversations: {
    history: vi.fn(),
  },
} as unknown as WebClient;

const mockAck = vi.fn();

describe('handleVoteAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const basePoll = {
    question: 'Are you hungry?',
    channelId: 'C123456',
    channelTimeStamp: '1234567890.123456',
    options: [
      { id: '1', label: 'YES' },
      { id: '2', label: 'NO' },
    ],
  };

  const baseVoteAction: SlackAction = {
    type: 'interactive_message',
    callback_id: 'poll_vote',
    user: {
      id: 'U123456',
      name: 'user1',
    },
    actions: [
      {
        type: 'button',
        name: 'vote_button',
        value: '',
      },
    ],
    team: {
      id: '',
      domain: '',
    },
    channel: {
      id: '',
      name: '',
    },
    action_ts: '',
    token: '',
    response_url: '',
    trigger_id: '',
  };

  it('successfully handles a vote action and updates the poll', async () => {
    const pollId = 'P123456';
    const optionId = 'option1';
    const userId = 'U123456';
    const poll = { ...basePoll };

    const voteAction: SlackAction = {
      ...baseVoteAction,
      user: { id: userId, name: 'user1' },
      actions: [{ type: 'button', name: 'vote_button', value: JSON.stringify({ pollId, optionId }) }],
    };

    const mockGetPoll = vi.fn().mockResolvedValue(poll);
    const mockVote = vi.fn().mockResolvedValue(true);

    PollService.prototype.vote = mockVote;
    PollService.prototype.getById = mockGetPoll;

    vi.mocked(pollDisplayBlock).mockReturnValue([
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `Poll: ${poll.question}`,
        },
      },
    ]);

    await handleVoteAction({
      ack: mockAck,
      body: voteAction,
      client: mockClient,
    });

    expect(mockVote).toHaveBeenCalledWith(pollId, { userId, optionId });
    expect(mockGetPoll).toHaveBeenCalledWith(pollId);

    expect(mockPostMessage).not.toHaveBeenCalled();

    expect(mockUpdateMessage).toHaveBeenCalledWith({
      channel: poll.channelId,
      ts: poll.channelTimeStamp,
      text: `Poll: ${poll.question}`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `Poll: ${poll.question}`,
          },
        },
      ],
    });
  });

  it('handles multiple votes with maxVote given', async () => {
    const pollId = 'P123456';
    const optionId = '2';
    const userId = 'U123456';

    const poll = {
      ...basePoll,
      multiple: true,
      maxVotes: 1,
      votes: [{ userId, optionId: '1' }],
    };

    const voteAction: SlackAction = {
      ...baseVoteAction,
      user: { id: userId, name: 'user1' },
      actions: [
        {
          type: 'button',
          name: 'vote_button',
          value: JSON.stringify({ pollId, optionId }),
        },
      ],
    };

    const mockGetPoll = vi.fn().mockResolvedValue(poll);
    const mockVote = vi.fn().mockResolvedValue(true);

    PollService.prototype.getById = mockGetPoll;
    PollService.prototype.vote = mockVote;

    vi.mocked(pollDisplayBlock).mockReturnValue([
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `Poll: ${poll.question}`,
        },
      },
    ]);

    await handleVoteAction({
      ack: mockAck,
      body: voteAction,
      client: mockClient,
    });

    expect(mockAck).toHaveBeenCalled();
    expect(mockGetPoll).toHaveBeenCalledWith(pollId);
    expect(mockVote).toHaveBeenCalledWith(pollId, { userId, optionId });
    expect(mockUpdateMessage).toHaveBeenCalledWith({
      channel: poll.channelId,
      ts: poll.channelTimeStamp,
      text: `Poll: ${poll.question}`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `Poll: ${poll.question}`,
          },
        },
      ],
    });
  });

  it('rejects vote when user exceeds maxVotes and sends ephemeral error', async () => {
    const pollId = 'P123456';
    const userId = 'U123456';
    const optionId = '3';

    const poll = {
      ...basePoll,
      multiple: true,
      maxVotes: 1,
      votes: [{ userId, optionId: '1' }],
    };

    const voteAction: SlackAction = {
      ...baseVoteAction,
      user: { id: userId, name: 'user1' },
      channel: { id: 'C123456', name: 'general' },
      actions: [
        {
          type: 'button',
          name: 'vote_button',
          value: JSON.stringify({ pollId, optionId }),
        },
      ],
    };

    const mockGetPoll = vi.fn().mockResolvedValue(poll);
    const mockVote = vi.fn().mockRejectedValue(new Error('Maximum number of votes reached'));

    PollService.prototype.getById = mockGetPoll;
    PollService.prototype.vote = mockVote;

    await handleVoteAction({
      ack: mockAck,
      body: voteAction,
      client: mockClient,
    });

    expect(mockAck).toHaveBeenCalled();
    expect(mockGetPoll).toHaveBeenCalledWith(pollId);
    expect(mockVote).toHaveBeenCalledWith(pollId, { userId, optionId });

    expect(mockPostEphemeral).toHaveBeenCalledWith({
      channel: 'C123456',
      user: userId,
      text: 'Maximum number of votes reached',
    });

    expect(mockUpdateMessage).not.toHaveBeenCalled();
  });

  it('adds a vote with maxVotes given', async () => {
    const pollId = 'P123456';
    const optionId = '2';
    const userId = 'U123456';

    const poll = {
      ...basePoll,
      multiple: true,
      maxVotes: 2,
    };

    const voteAction: SlackAction = {
      ...baseVoteAction,
      user: { id: userId, name: 'user1' },
      actions: [
        {
          type: 'button',
          name: 'vote_button',
          value: JSON.stringify({ pollId, optionId }),
        },
      ],
    };

    const mockGetPoll = vi.fn().mockResolvedValue(poll);
    const mockVote = vi.fn().mockResolvedValue(true);

    PollService.prototype.getById = mockGetPoll;
    PollService.prototype.vote = mockVote;

    vi.mocked(pollDisplayBlock).mockReturnValue([
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `Poll: ${poll.question}`,
        },
      },
    ]);

    await handleVoteAction({ ack: mockAck, body: voteAction, client: mockClient });

    expect(mockAck).toHaveBeenCalled();
    expect(mockGetPoll).toHaveBeenCalledWith(pollId);
    expect(mockVote).toHaveBeenCalledWith(pollId, { userId, optionId });
    expect(mockPostMessage).not.toHaveBeenCalled();
    expect(mockUpdateMessage).toHaveBeenCalledWith({
      channel: poll.channelId,
      ts: poll.channelTimeStamp,
      text: `Poll: ${poll.question}`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `Poll: ${poll.question}`,
          },
        },
      ],
    });
  });

  it('handles bad format of JSON in action.value', async () => {
    const voteAction: SlackAction = {
      type: 'interactive_message',
      callback_id: 'poll_vote',
      user: { id: 'U123', name: 'User' },
      actions: [
        {
          type: 'button',
          name: 'vote_button',
          value: '{invalid_json',
        },
      ],
      team: { id: '', domain: '' },
      channel: { id: '', name: '' },
      action_ts: '',
      token: '',
      response_url: '',
      trigger_id: '',
    };

    await handleVoteAction({ ack: mockAck, body: voteAction, client: mockClient });

    expect(mockAck).toHaveBeenCalled();
    expect(mockPostMessage).not.toHaveBeenCalled();
    expect(mockUpdateMessage).not.toHaveBeenCalled();
  });
});
