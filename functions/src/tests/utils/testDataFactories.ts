import { SlashCommand } from '@slack/bolt';
import { Poll, PollOption } from '../../types/poll';

/**
 * Factory functions for creating test data
 */
export class TestDataFactory {
  /**
   * Creates a mock Slack slash command
   */
  static createSlashCommand(overrides?: Partial<SlashCommand>): SlashCommand {
    return {
      token: 'test-token',
      team_id: 'T1234567890',
      team_domain: 'test-workspace',
      channel_id: 'C1234567890',
      channel_name: 'general',
      user_id: 'U1234567890',
      user_name: 'testuser',
      command: '/poll',
      text: '"What is your favorite color?" Red, Blue, Green',
      api_app_id: 'A1234567890',
      is_enterprise_install: 'false',
      response_url: 'https://hooks.slack.com/commands/1234/5678',
      trigger_id: 'trigger123.456.789',
      ...overrides,
    };
  }

  /**
   * Creates a mock poll object
   */
  static createPoll(overrides?: Partial<Poll>): Poll {
    return {
      question: 'What is your favorite color?',
      options: [
        { id: 'option1', label: 'Red' },
        { id: 'option2', label: 'Blue' },
        { id: 'option3', label: 'Green' },
      ],
      createdBy: 'U1234567890',
      channelId: 'C1234567890',
      channelTimeStamp: '1234567890.123456',
      multiple: false,
      maxVotes: 10,
      custom: false,
      anonymous: false,
      closed: false,
      createdAt: new Date().toISOString(),
      votes: [],
      ...overrides,
    };
  }

  /**
   * Creates a mock poll option
   */
  static createPollOption(overrides?: Partial<PollOption>): PollOption {
    return {
      id: 'option1',
      label: 'Test Option',
      ...overrides,
    };
  }

  /**
   * Creates a mock Slack user
   */
  static createSlackUser(overrides?: { id?: string; name?: string; team_id?: string }) {
    return {
      id: overrides?.id || 'U1234567890',
      name: overrides?.name || 'testuser',
      team_id: overrides?.team_id || 'T1234567890',
    };
  }

  /**
   * Creates a mock Slack channel
   */
  static createSlackChannel(overrides?: { id?: string; name?: string }) {
    return {
      id: overrides?.id || 'C1234567890',
      name: overrides?.name || 'general',
    };
  }

  /**
   * Creates a mock Slack team/workspace
   */
  static createSlackTeam(overrides?: { id?: string; domain?: string }) {
    return {
      id: overrides?.id || 'T1234567890',
      domain: overrides?.domain || 'test-workspace',
    };
  }

  /**
   * Creates a mock button action payload
   */
  static createButtonAction(overrides?: {
    action_id?: string;
    value?: string;
    pollId?: string;
    optionId?: string;
    user_id?: string;
    channel_id?: string;
    trigger_id?: string;
  }) {
    // Create proper JSON value for vote actions
    const actionValue = overrides?.action_id?.startsWith('vote_')
      ? JSON.stringify({
          pollId: overrides?.pollId || 'poll123',
          optionId: overrides?.optionId || 'option1',
        })
      : overrides?.value || 'default_value';

    return {
      type: 'block_actions',
      user: this.createSlackUser({ id: overrides?.user_id }),
      api_app_id: 'A1234567890',
      token: 'test-token',
      container: {
        type: 'message',
        message_ts: '1234567890.123456',
      },
      trigger_id: overrides?.trigger_id || 'trigger123.456.789',
      team: this.createSlackTeam(),
      enterprise: null,
      is_enterprise_install: 'false',
      channel: this.createSlackChannel({ id: overrides?.channel_id }),
      message: {
        type: 'message',
        subtype: undefined,
        text: 'Poll message',
        ts: '1234567890.123456',
        user: 'U1234567890',
        bot_id: 'B1234567890',
        blocks: [],
      },
      state: {
        values: {},
      },
      response_url: 'https://hooks.slack.com/actions/T1234567890/1234567890/abcdef',
      actions: [
        {
          type: 'button',
          action_id: overrides?.action_id || 'vote_option1',
          block_id: 'block1',
          text: {
            type: 'plain_text',
            text: 'Vote',
            emoji: true,
          },
          value: actionValue,
          action_ts: '1234567890.123456',
        },
      ],
    };
  }

  /**
   * Creates a mock view submission payload
   */
  static createViewSubmission(overrides?: {
    callback_id?: string;
    private_metadata?: string;
    user_id?: string;
    values?: Record<string, Record<string, { value?: string; type?: string }>>;
  }) {
    return {
      type: 'view_submission',
      team: this.createSlackTeam(),
      user: this.createSlackUser({ id: overrides?.user_id }),
      api_app_id: 'A1234567890',
      token: 'test-token',
      trigger_id: 'trigger123.456.789',
      view: {
        id: 'V1234567890',
        team_id: 'T1234567890',
        type: 'modal',
        blocks: [],
        private_metadata: overrides?.private_metadata || '',
        callback_id: overrides?.callback_id || 'test_modal',
        state: {
          values: overrides?.values || {},
        },
        hash: 'hash123',
        title: {
          type: 'plain_text',
          text: 'Test Modal',
          emoji: true,
        },
        close: {
          type: 'plain_text',
          text: 'Close',
          emoji: true,
        },
        clear_on_close: false,
        notify_on_close: false,
        root_view_id: 'V1234567890',
        app_id: 'A1234567890',
        external_id: '',
        app_installed_team_id: 'T1234567890',
        bot_id: 'B1234567890',
      },
      response_urls: [],
      is_enterprise_install: 'false',
      enterprise: null,
    };
  }

  /**
   * Creates poll command text variations for testing
   */
  static createPollCommandTexts() {
    return {
      simple: '"What is your favorite color?" Red, Blue, Green',
      withMultiple: 'multiple "What are your hobbies?" Reading, Gaming, Sports',
      withMaxVotes: 'limit 2 "Pick your top 2" Option1, Option2, Option3',
      withCustom: 'custom "Your choice?" Option1, Option2',
      withAnonymous: 'anonymous "Anonymous poll?" Option1, Option2',
      withAllFlags: 'multiple limit 3 custom anonymous "Complex poll?" Option1, Option2, Option3',
      help: 'help',
      info: 'info',
      create: 'create',
      invalid: 'invalid command format',
      tooFewOptions: '"Question?" OnlyOne',
    };
  }
}
