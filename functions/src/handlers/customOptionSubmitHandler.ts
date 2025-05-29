import { App, SlackViewMiddlewareArgs, ViewSubmitAction } from '@slack/bolt';
import { Logger } from '../utils/logger';
import { pollDisplayBlock } from '../components/pollDisplay';
import { PollService } from '../services/pollService';
import { PollOption } from '../types/poll';
import { v4 as uuidv4 } from 'uuid';

export const handleCustomOptionSubmit = async (
  args: SlackViewMiddlewareArgs<ViewSubmitAction> & { client: App['client'] }
) => {
  const { ack, view } = args;

  const log = new Logger().withContext({
    functionName: 'handleCustomOptionSubmit',
  });

  const timer = log.startTimer('handleCustomOptionSubmit');
  await ack();

  const pollId = view.private_metadata;

  const optionValue = view.state.values.option_block.option_input.value;

  if (!optionValue) {
    log.error('Option value is missing');
    throw new Error('Option value is missing');
  }

  log.debug('Custom option submitted', { pollId });

  const pollService = new PollService();

  try {
    const updatedPoll = await pollService.runTransaction(async (transaction) => {
      const poll = await pollService.getInTransaction(transaction, pollId);

      if (!poll) {
        throw new Error('Poll not found');
      }

      const newOption: PollOption = {
        id: uuidv4(),
        label: optionValue,
      };

      const updatedOptions = [...poll.options, newOption];

      await pollService.updateInTransaction(transaction, pollId, { options: updatedOptions });

      return { ...poll, options: updatedOptions };
    });

    log.debug('Poll updated with new option');

    if (updatedPoll.channelId && updatedPoll.channelTimeStamp) {
      try {
        await args.client.chat.update({
          channel: updatedPoll.channelId,
          ts: updatedPoll.channelTimeStamp,
          blocks: pollDisplayBlock(updatedPoll, pollId),
        });
        log.debug('Message was updated with new option');
      } catch (error) {
        log.error(String(error));
      }
    } else {
      log.error('Missing channel id or channel timestamp');
    }
  } catch (error) {
    log.error(String(error));
  }

  log.endTimer('handleCustomOptionSubmit', timer);
};
