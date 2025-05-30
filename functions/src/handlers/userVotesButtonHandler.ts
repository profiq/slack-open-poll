import { App, BlockAction, SlackActionMiddlewareArgs } from '@slack/bolt';
import { Logger } from '../utils/logger';
import { PollService } from '../services/pollService';
import { View } from '@slack/types';

export const handleUserVotesButton = async (
  args: SlackActionMiddlewareArgs<BlockAction> & { client: App['client'] }
) => {
  const { ack, body, client, action } = args;

  const log = new Logger().withContext({
    functionName: 'handleOpenButton',
  });

  await ack();

  try {
    const buttonAction = action as { value?: string };

    const pollId = buttonAction.value;

    if (!pollId) {
      log.error('Poll ID is missing');
      throw new Error();
    }
    if (!body.trigger_id) {
      log.error('Missing trigger ID');
      throw new Error();
    }

    const pollService = new PollService();

    const poll = await pollService.getById(pollId);
    if (!poll) {
      log.error('Missing poll');
      throw new Error();
    }

    const userId = (body.user && body.user.id) || '';

    const votes = poll.votes ?? [];
    const userVotes = votes.filter((vote) => vote.userId === userId);

    const options = poll.options ?? [];
    const optionLabelsById: Record<string, string> = {};
    for (const option of options) {
      optionLabelsById[option.id] = option.label;
    }

    const userVotesLabels: string[] = [];
    for (const vote of userVotes) {
      const label = optionLabelsById[vote.optionId];
      if (label) {
        userVotesLabels.push(`- ${label}`);
      } else {
        userVotesLabels.push(`- Unknown option`);
      }
    }

    let userVotesText: string;
    if (userVotesLabels.length > 0) {
      userVotesText = userVotesLabels.join('\n');
    } else {
      userVotesText = 'You have not voted yet';
    }

    const modalView: View = {
      type: 'modal',
      callback_id: 'user_votes_modal',
      title: {
        type: 'plain_text',
        text: 'Your votes',
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
            text: `Poll: ${poll.question}`,
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: userVotesText,
          },
        },
      ],
    };

    if (!body.view?.id) {
      log.error('Missing view ID for modal update');
      throw new Error();
    }

    await client.views.update({
      view_id: body.view.id,
      view: modalView,
    });
  } catch (error) {
    log.error(String(error));
  }
};
