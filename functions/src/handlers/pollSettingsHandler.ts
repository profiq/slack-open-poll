import { App, BlockAction, SlackActionMiddlewareArgs } from '@slack/bolt';
import { Logger } from '../utils/logger';
import { PollService } from '../services/pollService';
import { View } from '@slack/types';

export const handlePollSettingsButton = async (
  args: SlackActionMiddlewareArgs<BlockAction> & { client: App['client'] }
) => {
  const { ack, body, client, action } = args;

  const log = new Logger().withContext({
    functionName: 'handlePollSettingsButton',
  });

  await ack();

  try {
    if (action.type !== 'button' || typeof action.value !== 'string') {
      log.error('Poll ID is missing or action is not a button');
      throw new Error();
    }

    const pollId = action.value;

    if (!pollId) {
      log.error('Poll ID is missing');
      throw new Error();
    }
    if (!body.view?.id) {
      log.error('View ID is missing');
      throw new Error();
    }

    const pollService = new PollService();
    const poll = await pollService.getById(pollId);
    if (!poll) {
      log.error('Poll not found');
      throw new Error();
    }

    const settingsView: View = {
      type: 'modal',
      callback_id: 'poll_settings_modal',
      title: {
        type: 'plain_text',
        text: 'Poll Settings',
      },
      close: {
        type: 'plain_text',
        text: 'Cancel',
      },
      blocks: [
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              action_id: 'close_poll',
              text: {
                type: 'plain_text',
                text: 'Close Poll',
              },
              style: 'primary',
              value: pollId,
            },
            {
              type: 'button',
              action_id: 'delete_poll',
              text: {
                type: 'plain_text',
                text: 'Delete Poll',
              },
              style: 'danger',
              value: pollId,
              confirm: {
                title: {
                  type: 'plain_text',
                  text: 'Are you sure?',
                },
                text: {
                  type: 'mrkdwn',
                  text: 'This will permanently delete the poll.',
                },
                confirm: {
                  type: 'plain_text',
                  text: 'Yes, delete',
                },
                deny: {
                  type: 'plain_text',
                  text: 'Cancel',
                },
              },
            },
          ],
        },
      ],
    };

    const restrictedView: View = {
      type: 'modal',
      callback_id: 'poll_settings_modal',
      title: {
        type: 'plain_text',
        text: 'Poll Settings',
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
            text: '*Only the poll creator can access settings.*',
          },
        },
      ],
    };

    const userId = body.user.id;
    const isCreator = poll.createdBy === userId;

    await client.views.update({
      view_id: body.view.id,
      view: isCreator ? settingsView : restrictedView,
    });
  } catch (error) {
    log.error(String(error));
  }
};
