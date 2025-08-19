import { describe, it, expect, vi, beforeEach } from 'vitest';
import { App, BlockAction, ButtonAction, SlackActionMiddlewareArgs } from '@slack/bolt';
import { createLoggerMockFactory } from './mocks/commonMocks';

// Hoist Logger mock to avoid real logging
vi.mock('../utils/logger', () => createLoggerMockFactory());

import { handleFormCreation } from '../../src/handlers/customFormHandler';

describe('handleFormCreation', () => {
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
    action_id: 'open_custom_form',
    type: 'button',
    value: pollId,
    block_id: 'block_1',
    text: { type: 'plain_text', text: 'Add option' },
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

  it('acknowledges the action and opens a modal with correct structure', async () => {
    await handleFormCreation(args);

    expect(ack).toHaveBeenCalledOnce();
    expect(viewsOpen).toHaveBeenCalledWith({
      trigger_id: triggerId,
      view: expect.objectContaining({
        type: 'modal',
        callback_id: 'custom_option_submit',
        private_metadata: pollId,
        title: { type: 'plain_text', text: 'Add Another Option' },
        submit: { type: 'plain_text', text: 'Submit' },
        blocks: expect.arrayContaining([
          expect.objectContaining({
            type: 'input',
            block_id: 'option_block',
            label: { type: 'plain_text', text: 'Option' },
            element: expect.objectContaining({
              type: 'plain_text_input',
              action_id: 'option_input',
              placeholder: { type: 'plain_text', text: 'Enter your option here' },
            }),
          }),
        ]),
      }),
    });
  });

  it('includes the correct private_metadata in the modal', async () => {
    await handleFormCreation(args);

    const viewArg = viewsOpen.mock.calls[0][0].view;
    expect(viewArg.private_metadata).toBe(pollId);
  });

  it('handles multiple form openings with different pollIds correctly', async () => {
    const pollIds = ['poll_1', 'poll_2'];

    for (const id of pollIds) {
      const dynamicArgs = {
        ...args,
        action: { ...args.action, value: id },
      };
      await handleFormCreation(dynamicArgs);

      const viewArg = viewsOpen.mock.calls.at(-1)?.[0].view;
      expect(viewArg.private_metadata).toBe(id);
    }

    expect(ack).toHaveBeenCalledTimes(2);
  });

  it('does not call views.open if trigger id is missing', async () => {
    const badArgs = {
      ...args,
      body: {},
    } as typeof args;

    await expect(handleFormCreation(badArgs)).rejects.toThrow('Missing trigger id');

    expect(viewsOpen).not.toHaveBeenCalled();
    expect(ack).toHaveBeenCalledOnce();
  });
});
