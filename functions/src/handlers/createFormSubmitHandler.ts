import { App, SlackViewMiddlewareArgs, ViewSubmitAction } from '@slack/bolt';
import { Logger } from '../utils/logger';
import { PollService } from '../services/pollService';
import { mrkdwnSection } from '../components/mrkdwnSection';
import { AnyBlock } from '@slack/types';
import { pollDisplayBlock } from '../components/pollDisplay';

export const handleSubmitCreatePoll = async (
  args: SlackViewMiddlewareArgs<ViewSubmitAction> & { client: App['client'] }
) => {
  const { ack, view, body, client } = args;

  const log = new Logger().withContext({
    userId: body.user.id,
    workspaceId: body.team?.id,
    functionName: 'handleSumbitCreatePoll',
  });

  const timer = log.startTimer('handleSumbitCreatePoll');
  await ack();

  const pollId = view.private_metadata;

  const question = view.state.values.question.plain_text_input_question.value;

  const maxVotesString = view.state.values.option_value.number_input_limit_section.value;

  let maxVotes;
  if (maxVotesString != null) {
    maxVotes = parseInt(maxVotesString, 10);
    // console.log(question + "\n  " + maxVotes)
  }

  const custom = view.state.values.select_custom.static_select_custom_option.selected_option?.value;
  // console.log(custom);

  const allOptions: string[] = [];

  for (const [blockId, actionObj] of Object.entries(view.state.values)) {
    const action = Object.values(actionObj)[0];

    if (blockId.startsWith('option_input_') && typeof action.value === 'string' && action.value.trim() !== '') {
      allOptions.push(action.value.trim());
    }
  }
  // console.log(allOptions);

  log.debug('Option submitted', { pollId });

  const channelId = view.private_metadata;

  if (!channelId) {
    log.error('Channel ID is missing in private_metadata');
    throw new Error('Channel ID is missing');
  }

  if (!question) {
    log.error('Question is missing for Poll');
    throw new Error('Question is missing for Poll');
  }

  if (!maxVotes) {
    log.error('Number limit is missing');
    throw new Error('Number limit is missing');
  }

  if (!custom) {
    log.error('CustomOption is missing');
    throw new Error('CustomOption is missing');
  }

  const anonymous = false;

  const pollOptions = allOptions.map((label, index) => ({
    id: `${index + 1}`,
    label,
  }));

  const multiple = maxVotes > 1;

  const cus = custom === 'yes';

  const pollService = new PollService();

  try {
    /*
    console.log(
      question + ' ' +
      pollOptions + ' ' +
      body.user.id + ' ' +
      String(body.team?.id) + ' ' +
       +'\n        ' +
      multiple + ' ' +
      maxVotes + ' ' +
      cus + ' ' +
      anonymous);

     */
    const pollRef = await pollService.create({
      question,
      options: pollOptions,
      createdBy: body.user.id,
      channelId: channelId,
      channelTimeStamp: '',
      multiple,
      maxVotes,
      custom: cus,
      anonymous,
    });

    const pollSnap = await pollRef.get();
    const poll = pollSnap.data();

    if (!poll) {
      log.error('No poll was found');
      await client.chat.postEphemeral({
        channel: channelId,
        user: body.user.id,
        blocks: [mrkdwnSection('error', 'No poll was found')],
        text: 'No poll was found',
      });
      return;
    }

    log.info('Poll was created', { pollId: pollSnap.id });

    const blocks: AnyBlock[] = pollDisplayBlock(poll, pollSnap.id);

    const postedMessage = await client.chat.postMessage({
      channel: channelId,
      text: `Poll: ${poll?.question}`,
      blocks,
    });

    if (!postedMessage.ts) {
      log.error('Failed to get message timestamp');
      return;
    }

    await pollRef.update({
      channelTimeStamp: postedMessage.ts,
    });
  } catch (e) {
    log.error(String(e));
  }

  log.endTimer('handleSumbitCreatePoll', timer);
};
