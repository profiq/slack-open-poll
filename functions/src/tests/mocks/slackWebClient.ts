import { vi } from 'vitest';
import { WebClient } from '@slack/web-api';
import { 
  ChatPostMessageResponse, 
  ChatUpdateResponse, 
  ChatPostEphemeralResponse,
  ConversationsOpenResponse,
  ViewsOpenResponse,
  ViewsUpdateResponse
} from '@slack/web-api';

/**
 * Mock response builders for Slack Web API responses
 */
export class SlackApiResponseBuilder {
  static chatPostMessage(overrides?: Partial<ChatPostMessageResponse>): ChatPostMessageResponse {
    return {
      ok: true,
      channel: 'C1234567890',
      ts: '1234567890.123456',
      message: {
        type: 'message',
        subtype: undefined,
        text: 'Test message',
        ts: '1234567890.123456',
        user: 'U1234567890',
        bot_id: 'B1234567890',
        app_id: 'A1234567890',
        blocks: [],
      },
      ...overrides,
    };
  }

  static chatUpdate(overrides?: Partial<ChatUpdateResponse>): ChatUpdateResponse {
    return {
      ok: true,
      channel: 'C1234567890',
      ts: '1234567890.123456',
      text: 'Updated message',
      message: {
        type: 'message',
        text: 'Updated message',
        ts: '1234567890.123456',
        user: 'U1234567890',
        bot_id: 'B1234567890',
        app_id: 'A1234567890',
        blocks: [],
      } as Record<string, unknown>,
      ...overrides,
    };
  }

  static chatPostEphemeral(overrides?: Partial<ChatPostEphemeralResponse>): ChatPostEphemeralResponse {
    return {
      ok: true,
      message_ts: '1234567890.123456',
      ...overrides,
    };
  }

  static conversationsOpen(overrides?: Partial<ConversationsOpenResponse>): ConversationsOpenResponse {
    return {
      ok: true,
      channel: {
        id: 'D1234567890',
        is_channel: false,
        is_group: false,
        is_im: true,
        created: 1234567890,
        creator: 'U1234567890',
        is_archived: false,
        is_general: false,
        unlinked: 0,
        is_shared: false,
        is_ext_shared: false,
        is_org_shared: false,
        pending_shared: [],
        is_pending_ext_shared: false,
        is_member: true,
        is_private: true,
        is_mpim: false,
        last_read: '1234567890.123456',
        latest: {
          type: 'message',
          subtype: undefined,
          text: 'Hello',
          ts: '1234567890.123456',
          user: 'U1234567890',
        },
        unread_count: 0,
        unread_count_display: 0,
        is_open: true,
        priority: 0,
      } as Record<string, unknown>,
      ...overrides,
    };
  }

  static viewsOpen(overrides?: Partial<ViewsOpenResponse>): ViewsOpenResponse {
    return {
      ok: true,
      view: {
        id: 'V1234567890',
        team_id: 'T1234567890',
        type: 'modal',
        blocks: [],
        private_metadata: '',
        callback_id: 'test_modal',
        state: {
          values: {},
        },
        hash: 'hash123',
        title: {
          type: 'plain_text',
          text: 'Test Modal',
          emoji: true,
        } as Record<string, unknown>,
        close: {
          type: 'plain_text',
          text: 'Close',
          emoji: true,
        } as Record<string, unknown>,
        clear_on_close: false,
        notify_on_close: false,
        root_view_id: 'V1234567890',
        app_id: 'A1234567890',
        external_id: '',
        app_installed_team_id: 'T1234567890',
        bot_id: 'B1234567890',
      },
      ...overrides,
    };
  }

  static viewsUpdate(overrides?: Partial<ViewsUpdateResponse>): ViewsUpdateResponse {
    return {
      ok: true,
      view: {
        id: 'V1234567890',
        team_id: 'T1234567890',
        type: 'modal',
        blocks: [],
        private_metadata: '',
        callback_id: 'test_modal',
        state: {
          values: {},
        },
        hash: 'hash123',
        title: {
          type: 'plain_text',
          text: 'Updated Modal',
          emoji: true,
        } as Record<string, unknown>,
        close: {
          type: 'plain_text',
          text: 'Close',
          emoji: true,
        } as Record<string, unknown>,
        clear_on_close: false,
        notify_on_close: false,
        root_view_id: 'V1234567890',
        app_id: 'A1234567890',
        external_id: '',
        app_installed_team_id: 'T1234567890',
        bot_id: 'B1234567890',
      },
      ...overrides,
    };
  }

  static error(error: string, code?: string): { ok: false; error: string; response_metadata?: { messages: string[] } } {
    return {
      ok: false,
      error,
      response_metadata: code ? { messages: [code] } : undefined,
    };
  }
}

/**
 * Creates a comprehensive mock of the Slack WebClient
 */
export function createMockSlackWebClient() {
  const mockPostMessage = vi.fn();
  const mockUpdate = vi.fn();
  const mockPostEphemeral = vi.fn();
  const mockConversationsOpen = vi.fn();
  const mockConversationsHistory = vi.fn();
  const mockViewsOpen = vi.fn();
  const mockViewsUpdate = vi.fn();

  const mockClient = {
    chat: {
      postMessage: mockPostMessage,
      update: mockUpdate,
      postEphemeral: mockPostEphemeral,
    },
    conversations: {
      open: mockConversationsOpen,
      history: mockConversationsHistory,
    },
    views: {
      open: mockViewsOpen,
      update: mockViewsUpdate,
    },
    // Additional properties that might be accessed
    slackApiUrl: 'https://slack.com/api/',
    retryConfig: {},
    requestQueue: [],
    axios: {},
  } as unknown as WebClient;

  return {
    mockClient,
    mocks: {
      postMessage: mockPostMessage,
      update: mockUpdate,
      postEphemeral: mockPostEphemeral,
      conversationsOpen: mockConversationsOpen,
      conversationsHistory: mockConversationsHistory,
      viewsOpen: mockViewsOpen,
      viewsUpdate: mockViewsUpdate,
    },
  };
}

/**
 * Sets up default successful responses for all Slack API methods
 */
export function setupDefaultSlackResponses(mocks: ReturnType<typeof createMockSlackWebClient>['mocks']) {
  mocks.postMessage.mockResolvedValue(SlackApiResponseBuilder.chatPostMessage());
  mocks.update.mockResolvedValue(SlackApiResponseBuilder.chatUpdate());
  mocks.postEphemeral.mockResolvedValue(SlackApiResponseBuilder.chatPostEphemeral());
  mocks.conversationsOpen.mockResolvedValue(SlackApiResponseBuilder.conversationsOpen());
  mocks.conversationsHistory.mockResolvedValue({ ok: true, messages: [] });
  mocks.viewsOpen.mockResolvedValue(SlackApiResponseBuilder.viewsOpen());
  mocks.viewsUpdate.mockResolvedValue(SlackApiResponseBuilder.viewsUpdate());
}

/**
 * Resets all mock functions
 */
export function resetSlackMocks(mocks: ReturnType<typeof createMockSlackWebClient>['mocks']) {
  Object.values(mocks).forEach(mock => {
    mock.mockReset();
  });
}
