import { App, BlockAction, ButtonAction, SlackActionMiddlewareArgs } from '@slack/bolt';
import { Logger } from '../utils/logger';
import { PollService } from '../services/pollService';
import { pollResultBlock } from '../components/pollResult';
import { pollDisplayBlock } from '../components/pollDisplay';

export const handleClosePoll = async (args: SlackActionMiddlewareArgs<BlockAction> & { client: App['client'] }) => {
  const { ack, client, action } = args;

  const log = new Logger().withContext({
    functionName: 'handleClosePoll',
  });

  await ack();

  try {
    const pollId = (action as ButtonAction).value;

    if (!pollId) {
      log.error('Missing poll ID');
      throw new Error();
    }

    const pollService = new PollService();
    const poll = await pollService.getById(pollId);

    if (!poll) {
      log.error('Poll not found');
      throw new Error();
    }

    if (poll.closed) {
      log.debug('Poll was already closed');
      return;
    }

    await pollService.update(pollId, { closed: true });

    const updatedPoll = await pollService.getById(pollId);
    if (!updatedPoll) {
      log.error('Updated poll not found');
      throw new Error();
    }

    const channelId = updatedPoll.channelId;
    const messageTs = updatedPoll.channelTimeStamp;

    if (channelId && messageTs) {
      const resultBlock = pollResultBlock(updatedPoll);

      await client.chat.postMessage({
        channel: channelId,
        thread_ts: messageTs,
        text: 'POLL RESULTS!',
        blocks: resultBlock,
      });

      const updatedBlocks = pollDisplayBlock(updatedPoll, pollId);

      await client.chat.update({
        channel: channelId,
        ts: messageTs,
        text: `Poll: ${updatedPoll.question}`,
        blocks: updatedBlocks,
      });
    } else {
      log.error('Poll is missing channel id or channel timestamp');
    }
  } catch (error) {
    log.error(String(error));
  }
};
