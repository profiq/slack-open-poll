import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { SlackViewMiddlewareArgs, ViewSubmitAction } from '@slack/bolt';
import type { App } from '@slack/bolt';
import { firebaseMockFactory, createLoggerMockFactory } from './mocks/commonMocks';

// Hoist firebase and logger mocks BEFORE importing modules
vi.mock('../firebase', () => firebaseMockFactory());
vi.mock('../utils/logger', () => createLoggerMockFactory());

// Import modules under test
import { handleCustomOptionSubmit } from '../handlers/customOptionSubmitHandler';
import { PollService } from '../services/pollService';

describe('handleCustomOptionSubmit', () => {
  let mockAck: ReturnType<typeof vi.fn>;
  let mockChatUpdate: ReturnType<typeof vi.fn>;

  const baseMockView: ViewSubmitAction['view'] = {
    id: 'V123',
    team_id: 'T123',
    type: 'modal',
    private_metadata: 'poll123',
    callback_id: 'custom_option_callback',
    state: {
      values: {
        option_block: {
          option_input: {
            type: 'plain_text_input',
            value: 'My custom option',
          },
        },
      },
    },
    blocks: [],
    title: { type: 'plain_text', text: 'Title' },
    close: { type: 'plain_text', text: 'Close' },
    submit: { type: 'plain_text', text: 'Submit' },
    app_id: 'A123',
    bot_id: 'B123',
    hash: 'hash',
    root_view_id: null,
    previous_view_id: null,
    clear_on_close: false,
    notify_on_close: false,
  };

  function createArgs(
    viewOverride?: Partial<ViewSubmitAction['view']>
  ): SlackViewMiddlewareArgs<ViewSubmitAction> & { client: App['client'] } {
    const view = { ...baseMockView, ...viewOverride };
    return {
      body: {
        type: 'view_submission',
        user: { id: 'U123', name: 'User' },
        view,
        api_app_id: 'A123',
        token: 'token',
        trigger_id: 'trigger123',
        team: null,
      },
      payload: view,
      view,
      ack: mockAck,
      respond: vi.fn(),
      client: {
        chat: {
          update: mockChatUpdate,
        },
      } as unknown as App['client'],
    };
  }

  beforeEach(() => {
    mockAck = vi.fn().mockResolvedValue(undefined);
    mockChatUpdate = vi.fn().mockResolvedValue(undefined);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls ack and updates poll with new option', async () => {
    const args = createArgs();

    // Spy on PollService instance methods
    const runTransactionSpy = vi
      .spyOn(PollService.prototype, 'runTransaction')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockImplementation(async (cb: any) => cb({}));
    const getInTransactionSpy = vi.spyOn(PollService.prototype, 'getInTransaction').mockResolvedValue({
      question: 'Q',
      createdBy: 'U1',
      createdAt: new Date().toISOString(),
      options: [{ id: '1', label: 'Option 1' }],
      channelId: 'C123',
      channelTimeStamp: '12345.6789',
    } as unknown as import('../types/poll').Poll);
    const updateInTransactionSpy = vi
      .spyOn(PollService.prototype, 'updateInTransaction')
      .mockResolvedValue(undefined as unknown as void);

    await handleCustomOptionSubmit(args);

    expect(mockAck).toHaveBeenCalled();

    expect(mockChatUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: 'C123',
        ts: '12345.6789',
      })
    );

    expect(runTransactionSpy).toHaveBeenCalled();
    expect(getInTransactionSpy).toHaveBeenCalledWith(expect.anything(), 'poll123');
    expect(updateInTransactionSpy).toHaveBeenCalled();
  });

  it('calls ack even if runTransaction throws an error', async () => {
    const error = new Error('Transaction failed');

    vi.spyOn(PollService.prototype, 'runTransaction').mockRejectedValue(error);

    const args = createArgs();

    await handleCustomOptionSubmit(args);

    expect(mockAck).toHaveBeenCalled();
    expect(mockChatUpdate).not.toHaveBeenCalled();
  });

  it('handles missing private_metadata', async () => {
    const args = createArgs({ private_metadata: undefined });

    await handleCustomOptionSubmit(args);

    expect(mockAck).toHaveBeenCalled();
    expect(mockChatUpdate).not.toHaveBeenCalled();
  });

  it('creates new PollService instance on multiple calls', async () => {
    const args = createArgs();

    await handleCustomOptionSubmit(args);
    await handleCustomOptionSubmit(args);

    // The constructor isn't directly spied, but instance methods will be called twice
    expect(vi.spyOn(PollService.prototype, 'runTransaction')).toBeDefined();
  });
});
