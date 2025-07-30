import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handlePollCommand } from '../handlers/pollCreationHandler';
import { PollService } from '../services/pollService';
import { pollDisplayBlock } from '../components/pollDisplay';
import { AllMiddlewareArgs, SlackCommandMiddlewareArgs, SlashCommand, StringIndexed } from '@slack/bolt';
import { AnyBlock } from '@slack/types';
import { Logger } from '@slack/logger';
import { WebClient } from '@slack/web-api';

vi.mock('../services/pollService');
vi.mock('../components/pollDisplay');

const mockPostEphemeral = vi.fn();
const mockPostMessage = vi.fn();
const mockUpdate = vi.fn();
const mockConversationsHistory = vi.fn();

const mockClient = {
  chat: {
    postEphemeral: mockPostEphemeral,
    postMessage: mockPostMessage,
    update: mockUpdate,
  },
  conversations: {
    history: mockConversationsHistory,
  },
  slackApiUrl: '',
  retryConfig: {},
  requestQueue: [],
  axios: {},
} as unknown as WebClient;

const mockAck = vi.fn();
const mockRespond = vi.fn();

const mockLogger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  fatal: vi.fn(),
  trace: vi.fn(),
  log: vi.fn(),
  setLevel: vi.fn(),
  getLevel: vi.fn().mockReturnValue('info'),
  setName: vi.fn(),
} as unknown as Logger;

const baseCommand: SlackCommandMiddlewareArgs & AllMiddlewareArgs<StringIndexed> = {
  command: {
    token: '',
    team_id: '',
    team_domain: '',
    enterprise_id: '',
    enterprise_name: '',
    channel_id: '',
    channel_name: '',
    user_id: '',
    user_name: '',
    command: '/poll',
    text: '',
    response_url: '',
    trigger_id: '',
    api_app_id: '',
    is_enterprise_install: false,
    token_type: '',
  } as unknown as SlashCommand,
  ack: mockAck,
  respond: mockRespond,
  payload: {
    token: '',
    command: '',
    text: '',
    response_url: '',
    trigger_id: '',
    user_id: '',
    user_name: '',
    team_id: '',
    team_domain: '',
    channel_id: '',
    channel_name: '',
    api_app_id: '',
  },
  body: {
    token: '',
    command: '',
    text: '',
    response_url: '',
    trigger_id: '',
    user_id: '',
    user_name: '',
    team_id: '',
    team_domain: '',
    channel_id: '',
    channel_name: '',
    api_app_id: '',
  },
  client: mockClient,
  say: vi.fn(),
  context: {
    isEnterpriseInstall: false,
  },
  logger: mockLogger,
  next: vi.fn(),
};

describe('handlePollCommand Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('responds with error if format is invalid', async () => {
    const commandWithInvalidFormat: SlackCommandMiddlewareArgs & AllMiddlewareArgs = {
      ...baseCommand,
      command: {
        ...baseCommand.command,
        text: 'Invalid format',
      },
      client: mockClient,
    };

    await handlePollCommand(commandWithInvalidFormat);

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
    const commandWithOneOption: SlackCommandMiddlewareArgs & AllMiddlewareArgs = {
      ...baseCommand,
      command: {
        ...baseCommand.command,
        text,
      },
      client: mockClient,
    };

    await handlePollCommand(commandWithOneOption);

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
    const commandWithExcessiveOptions: SlackCommandMiddlewareArgs & AllMiddlewareArgs = {
      ...baseCommand,
      command: {
        ...baseCommand.command,
        text,
      },
      client: mockClient,
    };

    await handlePollCommand(commandWithExcessiveOptions);

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

    const commandWithPoll: SlackCommandMiddlewareArgs & AllMiddlewareArgs = {
      ...baseCommand,
      command: {
        ...baseCommand.command,
        text,
      },
      client: mockClient,
    };

    await handlePollCommand(commandWithPoll);

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

    const commandWithPollError: SlackCommandMiddlewareArgs & AllMiddlewareArgs = {
      ...baseCommand,
      command: { ...baseCommand.command, text },
      client: mockClient,
    };

    await handlePollCommand(commandWithPollError);

    expect(mockPostEphemeral).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: baseCommand.command.channel_id,
        user: baseCommand.command.user_id,
        text: 'An error occurred',
      })
    );
  });
});
