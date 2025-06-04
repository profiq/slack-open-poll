import { App, BlockAction, ButtonAction, SlackActionMiddlewareArgs } from '@slack/bolt';
import { Logger } from '../utils/logger';
import { PollService } from '../services/pollService';

export const handleDeletePoll = async (args: SlackActionMiddlewareArgs<BlockAction> & { client: App['client'] }) => {
  const { ack, body, client, action } = args;

  const log = new Logger().withContext({
    functionName: 'handleDeletePoll',
  });

  await ack();

  try {
    const pollId = (action as ButtonAction).value;

    if (!pollId) {
      log.error('Missing poll ID');
      throw new Error('Missing poll ID');
    }

    const pollService = new PollService();
    const poll = await pollService.getById(pollId);

    if (!poll) {
      log.error(`Poll not found: ${pollId}`);
      throw new Error(`Poll not found: ${pollId}`);
    }

    if (poll.channelId && poll.channelTimeStamp) {
      await client.chat.delete({
        channel: poll.channelId,
        ts: poll.channelTimeStamp,
      });
    } else {
      log.error('Poll is missing channelId or channelTimeStamp for deletion');
    }

    await pollService.delete(pollId);

    if (body.view?.id) {
      await client.views.update({
        view_id: body.view.id,
        view: {
          type: 'modal',
          title: {
            type: 'plain_text',
            text: 'Poll Deleted',
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
                text: 'This poll has been successfully deleted.',
              },
            },
          ],
        },
      });
    }
  } catch (error) {
    log.error(String(error));
  }
};
