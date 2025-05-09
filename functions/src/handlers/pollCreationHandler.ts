import { PollService } from '../services/pollService';
import { pollDisplayBlock } from '../components/pollDisplay';
import { mrkdwnSection } from '../components/mrkdwnSection';
import { AnyBlock } from '@slack/types';
import { AllMiddlewareArgs, SlackCommandMiddlewareArgs } from '@slack/bolt';
import { Logger } from '../utils/logger';

export const handlePollCommand = async ({
  command,
  ack,
  client,
}: SlackCommandMiddlewareArgs & AllMiddlewareArgs): Promise<void> => {
  await ack();

  const parsed = parseCommand(command.text || '');

  const log = new Logger({
    userId: command.user_id,
    workspaceId: command.team_id,
    functionName: 'handlePollCommand',
  });

  if (!parsed) {
    await client.chat.postEphemeral({
      channel: command.channel_id,
      user: command.user_id,
      text: 'Invalid format. Use: /poll "Your question?" option1, option2, ...',
    });
    return;
  }

  const { question, options, multiple } = parsed;

  if (options.length < 2) {
    log.warn('Creating poll failed: Less than 2 options provided');
    await client.chat.postEphemeral({
      channel: command.channel_id,
      user: command.user_id,
      blocks: [mrkdwnSection('error', 'Please provide at least 2 options')],
      text: 'Please provide at least 2 options.',
    });
    return;
  }

  if (options.length > 10) {
    log.warn('Creating poll failed: More than 10 options provided');
    await client.chat.postEphemeral({
      channel: command.channel_id,
      user: command.user_id,
      blocks: [mrkdwnSection('error', 'You can only provide up to 10 options')],
      text: 'You can only provide up to 10 options.',
    });
  }

  const pollOptions = options.map((label, index) => ({
    id: `${index + 1}`,
    label,
  }));

  const pollService = new PollService();
  try {
    const timestamp = new Date().toISOString();
    const pollRef = await pollService.create({
      question,
      options: pollOptions,
      createdBy: command.user_id,
      channelId: command.channel_id,
      channelTimeStamp: timestamp,
      multiple,
    });

    const pollSnap = await pollRef.get();
    const poll = pollSnap.data();

    if (!poll) {
      log.error('No poll was found');
      await client.chat.postEphemeral({
        channel: command.channel_id,
        user: command.user_id,
        blocks: [mrkdwnSection('error', 'No poll was found')],
        text: 'No poll was found',
      });
    }

    log.info('Poll was created', { pollId: pollSnap.id });

    const blocks: AnyBlock[] = pollDisplayBlock(poll, pollSnap.id);

    await client.chat.postMessage({
      channel: command.channel_id,
      text: `Poll: ${poll?.question}`,
      blocks,
    });
  } catch (error) {
    log.error(String(error));

    await client.chat.postEphemeral({
      channel: command.channel_id,
      user: command.user_id,
      blocks: [mrkdwnSection('error', `Error: ${error}`)],
      text: 'An error occurrred',
    });
    return;
  }
};

function parseCommand(
  text: string
): { question: string; options: string[]; flags: string[]; multiple: boolean } | null {
  const quoteIndex = text.indexOf('"');

  const keyWordPart = text.slice(0, quoteIndex).trim();

  const isMultiple = keyWordPart.includes('multiple');

  const withoutKeywords = text.slice(quoteIndex).trim();

  const questionMatch = withoutKeywords.match(/^["]([^"]+)["]/);
  if (!questionMatch) {
    return null;
  }

  const question = questionMatch[1];
  const remainingText = withoutKeywords.slice(questionMatch[0].length).trim();

  const [optionsPart, ...flagsFull] = remainingText.split('--');
  const options = optionsPart
    .split(',')
    .map((o) => o.trim())
    .filter((o) => o.length > 0);

  const flags = flagsFull.map((f) => f.trim());

  return {
    question,
    options,
    flags,
    multiple: isMultiple,
  };
}
