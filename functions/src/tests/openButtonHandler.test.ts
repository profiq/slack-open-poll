import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Firebase Admin SDK before any imports
vi.mock('firebase-admin', () => ({
  default: {
    initializeApp: vi.fn(),
    firestore: vi.fn(() => ({
      collection: vi.fn(() => ({
        withConverter: vi.fn(() => ({
          doc: vi.fn(() => ({
            get: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
            set: vi.fn(),
          })),
          add: vi.fn(),
          get: vi.fn(),
        })),
      })),
      runTransaction: vi.fn(),
      listCollections: vi.fn().mockResolvedValue([]),
    })),
  },
}));

// Mock Firebase Functions Logger
vi.mock('firebase-functions/logger', () => ({
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}));

// Mock the firebase.ts file to prevent initialization
vi.mock('../firebase', () => ({
  firestore: {
    collection: vi.fn(() => ({
      withConverter: vi.fn(() => ({
        doc: vi.fn(() => ({
          get: vi.fn(),
          update: vi.fn(),
          delete: vi.fn(),
          set: vi.fn(),
        })),
        add: vi.fn(),
        get: vi.fn(),
      })),
    })),
    runTransaction: vi.fn(),
    listCollections: vi.fn().mockResolvedValue([]),
  },
}));

// Mock PollService
const mockGetById = vi.fn();
vi.mock('../services/pollService', () => ({
  PollService: vi.fn().mockImplementation(() => ({
    getById: mockGetById,
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    vote: vi.fn(),
  })),
}));

// Mock Logger to prevent Firebase Functions logger calls
vi.mock('../utils/logger', () => ({
  Logger: vi.fn().mockImplementation(() => ({
    withContext: vi.fn().mockReturnThis(),
    startTimer: vi.fn().mockReturnValue(Date.now()),
    endTimer: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

import { handleOpenButton } from '../handlers/openButtonHandler';
import { App, BlockAction, ButtonAction, SlackActionMiddlewareArgs } from '@slack/bolt';
import { createMockPoll, createMockSlackBody } from './utils/unitTestSetup';

describe('handleOpenButton', () => {
  const ack = vi.fn();
  const viewsOpen = vi.fn();
  const triggerId = 'trigger_123';
  const pollId = 'poll_abc';

  const client = {
    views: {
      open: viewsOpen,
    },
  } as unknown as App['client'];

  const body = createMockSlackBody({ trigger_id: triggerId });

  const action: ButtonAction = {
    action_id: 'open_button',
    type: 'button',
    value: pollId,
    block_id: 'block_1',
    text: { type: 'plain_text', text: 'Open' },
    action_ts: '123456789.000000',
  };

  const args = {
    ack,
    body,
    client,
    action,
  } as unknown as SlackActionMiddlewareArgs<BlockAction> & { client: App['client'] };

  // Mock poll data
  const mockPoll = createMockPoll({ id: pollId });

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup PollService mock to return the mock poll
    mockGetById.mockResolvedValue(mockPoll);
  });

  it('acknowledges the button click and opens a modal', async () => {
    await handleOpenButton(args);

    expect(ack).toHaveBeenCalledOnce();
    expect(viewsOpen).toHaveBeenCalledWith({
      trigger_id: triggerId,
      view: expect.objectContaining({
        type: 'modal',
        callback_id: 'poll_modal',
        title: { type: 'plain_text', text: 'Poll Options' },
        close: { type: 'plain_text', text: 'Close' },
        blocks: expect.arrayContaining([
          expect.objectContaining({
            type: 'actions',
            elements: expect.arrayContaining([
              expect.objectContaining({
                type: 'button',
                action_id: 'your_votes',
                value: pollId,
              }),
              expect.objectContaining({
                type: 'button',
                action_id: 'poll_settings',
                value: pollId,
              }),
            ]),
          }),
        ]),
      }),
    });
  });

  it('includes the correct value in both buttons', async () => {
    await handleOpenButton(args);

    const viewArg = viewsOpen.mock.calls[0][0].view;

    const buttonElements = viewArg.blocks[0].elements;
    const values = buttonElements.map((el: ButtonAction) => el.value);

    expect(values).toEqual([pollId, pollId]);
  });

  it('handles multiple opens with different pollIds correctly', async () => {
    const pollIds = ['poll_1', 'poll_2'];

    for (const id of pollIds) {
      const dynamicArgs = {
        ...args,
        action: { ...args.action, value: id },
      };
      await handleOpenButton(dynamicArgs);

      const viewArg = viewsOpen.mock.calls.at(-1)?.[0].view;
      const values = viewArg.blocks[0].elements.map((el: ButtonAction) => el.value);

      expect(values).toEqual([id, id]);
    }

    expect(ack).toHaveBeenCalledTimes(2);
  });

  it('throws an error if trigger_id is missing and does not call views.open', async () => {
    const badArgs = {
      ...args,
      body: {} as typeof args.body,
    };

    await expect(handleOpenButton(badArgs)).rejects.toThrow('Missing trigger id');

    expect(viewsOpen).not.toHaveBeenCalled();
    expect(ack).toHaveBeenCalledOnce();
  });

  it('throws an error if poll is not found', async () => {
    mockGetById.mockResolvedValue(null);

    await expect(handleOpenButton(args)).rejects.toThrow();

    expect(ack).toHaveBeenCalledOnce();
    expect(viewsOpen).not.toHaveBeenCalled();
  });

  it('shows creator view when user is poll creator', async () => {
    const creatorPoll = { ...mockPoll, createdBy: 'U123456' };
    mockGetById.mockResolvedValue(creatorPoll);

    await handleOpenButton(args);

    expect(ack).toHaveBeenCalledOnce();
    expect(viewsOpen).toHaveBeenCalledWith({
      trigger_id: triggerId,
      view: expect.objectContaining({
        blocks: expect.arrayContaining([
          expect.objectContaining({
            elements: expect.arrayContaining([
              expect.objectContaining({ action_id: 'your_votes' }),
              expect.objectContaining({ action_id: 'poll_settings' }),
            ]),
          }),
        ]),
      }),
    });
  });

  it('shows user view when user is not poll creator', async () => {
    const nonCreatorPoll = { ...mockPoll, createdBy: 'U999999' };
    mockGetById.mockResolvedValue(nonCreatorPoll);

    await handleOpenButton(args);

    expect(ack).toHaveBeenCalledOnce();
    expect(viewsOpen).toHaveBeenCalledWith({
      trigger_id: triggerId,
      view: expect.objectContaining({
        blocks: expect.arrayContaining([
          expect.objectContaining({
            elements: expect.arrayContaining([expect.objectContaining({ action_id: 'your_votes' })]),
          }),
        ]),
      }),
    });

    // Should not have poll_settings button for non-creators
    const viewArg = viewsOpen.mock.calls[0][0].view;
    const buttonElements = viewArg.blocks[0].elements;
    const actionIds = buttonElements.map((el: ButtonAction) => el.action_id);
    expect(actionIds).not.toContain('poll_settings');
  });
});
