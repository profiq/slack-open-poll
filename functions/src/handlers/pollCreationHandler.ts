import { PollService } from '../services/pollService';
import { pollDisplayBlock } from '../components/pollDisplay';
import { mrkdwnSection, pollHelpMessage, pollInfoMessage } from '../components/mrkdwnSection';
import { AnyBlock } from '@slack/types';
import { AllMiddlewareArgs, SlackCommandMiddlewareArgs } from '@slack/bolt';
import { Logger } from '../utils/logger';
import { pollFormCreate } from '../components/pollFormCreate';

export const handlePollCommand = async ({
  command,
  ack,
  client,
  body,
}: SlackCommandMiddlewareArgs & AllMiddlewareArgs): Promise<void> => {
  await ack();

  const parsed = await parseCommand(command.text || '');

  const log = new Logger({
    userId: command.user_id,
    workspaceId: command.team_id,
    functionName: 'handlePollCommand',
  });

  log.debug('Received command ');

  if (!parsed) {
    await client.chat.postEphemeral({
      channel: command.channel_id,
      user: command.user_id,
      text: 'Invalid format. Use: /poll "Your question?" option1, option2, ...',
    });
    return;
  }

  const { question, options, multiple, maxVotes, custom, anonymous, help, info, create } = parsed;

  if (help) {
    await client.chat.postEphemeral({
      channel: command.channel_id,
      user: command.user_id,
      blocks: pollHelpMessage(),
    });
    return;
  }
  if (info) {
    await client.chat.postEphemeral({
      channel: command.channel_id,
      user: command.user_id,
      blocks: pollInfoMessage(),
    });
    return;
  }

  if (create) {
    await client.views.open(pollFormCreate(body, command));
    return;
  }
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
    const pollRef = await pollService.create({
      question,
      options: pollOptions,
      createdBy: command.user_id,
      channelId: command.channel_id,
      channelTimeStamp: '',
      multiple,
      maxVotes,
      custom,
      anonymous,
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

    const postedMessage = await client.chat.postMessage({
      channel: command.channel_id,
      text: `Poll: ${poll?.question}`,
      blocks,
    });

    if (!postedMessage.ts) {
      log.error('Failed to get message timestamp');
    }

    await pollRef.update({
      channelTimeStamp: postedMessage.ts,
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

export const parseCommand = async (
  text: string
): Promise<{
  question: string;
  options: string[];
  flags: string[];
  multiple: boolean;
  maxVotes?: number;
  custom?: boolean;
  anonymous?: boolean;
  help: boolean;
  info: boolean;
  create: boolean;
} | null> => {
  const quoteIndex = text.indexOf('"');

  const keyWordPart = text.slice(0, quoteIndex).trim();

  const trimmed = text.trim().toLowerCase();
  if (trimmed === 'help') {
    return {
      question: '',
      options: [],
      flags: [],
      multiple: false,
      help: true,
      info: false,
      create: false,
    };
  }
  if (trimmed === 'info') {
    return {
      question: '',
      options: [],
      flags: [],
      multiple: false,
      help: false,
      info: true,
      create: false,
    };
  }
  if (trimmed === 'create') {
    return {
      question: '',
      options: [],
      flags: [],
      multiple: false,
      help: false,
      info: false,
      create: true,
    };
  }

  let isMultiple = keyWordPart.includes('multiple');

  const isCustom = keyWordPart.includes('custom') || keyWordPart.includes('-c');

  const isAnonymous = keyWordPart.includes('anonymous') || keyWordPart.includes('-a');

  const maxVotesMatch = keyWordPart.match(/limit\s+(\d{1,2})/i);
  let maxVotes = 1;

  if (maxVotesMatch) {
    const parsedInt = parseInt(maxVotesMatch[1], 10);
    if (parsedInt >= 2 && parsedInt <= 10) {
      maxVotes = parsedInt;
    }
    isMultiple = true;
  } else {
    maxVotes = 10;
  }

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
    maxVotes: maxVotes,
    custom: isCustom,
    anonymous: isAnonymous,
    help: false,
    info: false,
    create: false,
  };
};
