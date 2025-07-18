import { App, BlockAction, ButtonAction, SlackActionMiddlewareArgs } from '@slack/bolt';
import { View } from '@slack/types';
import { Logger } from '../utils/logger';
import { PollService } from '../services/pollService';

export const handleOpenButton = async (args: SlackActionMiddlewareArgs<BlockAction> & { client: App['client'] }) => {
  const { ack, body, client } = args;

  const log = new Logger().withContext({
    functionName: 'handleOpenButton',
  });

  const handleOpenButtonCreationTimer = log.startTimer('handleOpenButton');
  await ack();

  const { action } = args;
  const pollId = (action as ButtonAction).value;
  const triggerId = body.trigger_id;

  if (!triggerId) {
    log.error('Missing trigger id');
    throw new Error('Missing trigger id');
  }

  if (!pollId) {
    log.error('Poll ID is missing');
    throw new Error();
  }

  const pollService = new PollService();
  const poll = await pollService.getById(pollId);

  if (!poll) {
    log.error('Poll not found');
    throw new Error();
  }

  try {
    const modalViewCreator: View = {
      type: 'modal',
      callback_id: 'poll_modal',
      title: {
        type: 'plain_text',
        text: 'Poll Options',
      },
      close: {
        type: 'plain_text',
        text: 'Close',
      },
      blocks: [
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'Your Votes',
                emoji: true,
              },
              style: 'primary',
              action_id: 'your_votes',
              value: pollId,
            },
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'Poll Actions',
                emoji: true,
              },
              style: 'primary',
              action_id: 'poll_settings',
              value: pollId,
            },
          ],
        },
      ],
    };

    const modalViewUser: View = {
      type: 'modal',
      callback_id: 'poll_modal',
      title: {
        type: 'plain_text',
        text: 'Poll Options',
      },
      close: {
        type: 'plain_text',
        text: 'Close',
      },
      blocks: [
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'Your Votes',
                emoji: true,
              },
              style: 'primary',
              action_id: 'your_votes',
              value: pollId,
            },
          ],
        },
      ],
    };

    const userId = body.user.id;
    const isCreator = poll.createdBy === userId;

    await client.views.open({
      trigger_id: triggerId,
      view: isCreator ? modalViewCreator : modalViewUser,
    });
  } catch (error) {
    log.error(String(error));
  }

  log.endTimer('handleOpenButton', handleOpenButtonCreationTimer);
};
