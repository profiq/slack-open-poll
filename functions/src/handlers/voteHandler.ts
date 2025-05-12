import { SlackAction, InteractiveAction, BlockElementAction, App } from '@slack/bolt';
import { PollService } from '../services/pollService';
import { Vote } from '../types/poll';
import { pollDisplayBlock } from '../components/pollDisplay';
import { Logger, LoggerContext } from '../utils/logger';
import { z } from 'zod';

const voteActionValue = z.object({
  pollId: z.string(),
  optionId: z.string(),
});

export const handleVoteAction = async ({
  ack,
  body,
  client,
}: {
  ack: () => Promise<void>;
  body: SlackAction | InteractiveAction | BlockElementAction;
  client: App['client'];
}) => {
  await ack();

  if (!('user' in body)) {
    throw new Error('User not found in action body');
  }

  const log = new Logger().withContext({
    userId: body.user.id,
    functionName: 'handleVoteAction',
  });

  const timerStart = log.startTimer('voteAction');

  try {
    if ('actions' in body) {
      const { actions } = body;

      if (actions?.length > 0) {
        const action = actions[0];

        if (action.type === 'button' && action.value) {
          const parseResult = voteActionValue.safeParse(JSON.parse(action.value));
          if (!parseResult.success) {
            log.warn('Invalid action.value format');
            return;
          }

          const { pollId, optionId } = parseResult.data;
          const userId = body.user.id;

          const vote: Vote = {
            userId,
            optionId,
          };

          const pollService = new PollService();

          log.debug('Submiting vote', { pollId, optionId } as LoggerContext);
          await pollService.vote(pollId, vote);

          const poll = await pollService.getById(pollId);
          if (!poll) {
            log.warn('Poll not found', { pollId });
            throw new Error('Poll not found');
          }

          const updatedBlocks = pollDisplayBlock(poll, pollId);

          const channelId = poll.channelId;
          const messageTs = poll.channelTimeStamp;

          if (!messageTs || typeof messageTs !== 'string') {
            log.error('Missing or invalid message timestamp', { messageTs } as LoggerContext);
            return;
          }

          if (!messageTs) {
            log.info('No message found at this timestamp, posting new poll', { messageTs } as LoggerContext);
            await client.chat.postMessage({
              channel: channelId,
              text: `Poll: ${poll.question}`,
              blocks: updatedBlocks,
            });
            return;
          }

          log.info('Updating existing poll message', {
            pollId,
            messageTs,
            channelId,
          } as LoggerContext);
          await client.chat.update({
            channel: channelId,
            ts: messageTs,
            text: `Poll: ${poll.question}`,
            blocks: updatedBlocks,
          });
        }
      }
    }
  } catch (error) {
    log.error(String(error));
  } finally {
    log.endTimer('voteAction', timerStart);
  }
};
