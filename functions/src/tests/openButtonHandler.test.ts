import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleOpenButton } from '../../src/handlers/openButtonHandler';
import { App, BlockAction, ButtonAction, SlackActionMiddlewareArgs } from '@slack/bolt';

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

  const body = {
    trigger_id: triggerId,
  };

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

  beforeEach(() => {
    vi.clearAllMocks();
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
      body: {},
    } as typeof args;

    await expect(handleOpenButton(badArgs)).rejects.toThrow('Missing trigger id');

    expect(viewsOpen).not.toHaveBeenCalled();
    expect(ack).toHaveBeenCalledOnce();
  });
});
