import { describe, it, expect, vi, beforeEach } from 'vitest';
import { App, BlockAction, ButtonAction, SlackActionMiddlewareArgs } from '@slack/bolt';
import { firebaseMockFactory, createLoggerMockFactory } from './mocks/commonMocks';

// Hoist firebase mock to avoid real initialization
vi.mock('../firebase', () => firebaseMockFactory());

// Mock Logger
vi.mock('../utils/logger', () => createLoggerMockFactory());

import { handleOpenButton } from '../handlers/openButtonHandler';
import { PollService } from '../services/pollService';
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

    // Setup PollService spy to return the mock poll
    vi.spyOn(PollService.prototype, 'getById').mockResolvedValue(mockPoll);
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
    vi.spyOn(PollService.prototype, 'getById').mockResolvedValue(null);

    await expect(handleOpenButton(args)).rejects.toThrow();

    expect(ack).toHaveBeenCalledOnce();
    expect(viewsOpen).not.toHaveBeenCalled();
  });

  it('shows creator view when user is poll creator', async () => {
    const creatorPoll = { ...mockPoll, createdBy: 'U123456' };
    vi.spyOn(PollService.prototype, 'getById').mockResolvedValue(creatorPoll);

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
    vi.spyOn(PollService.prototype, 'getById').mockResolvedValue(nonCreatorPoll);

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
