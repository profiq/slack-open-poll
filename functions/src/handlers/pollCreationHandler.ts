import { PollService } from '../services/pollService';
import { pollDisplayBlock } from '../components/pollDisplay';
import { mrkdwnSection, pollHelpMessage, pollInfoMessage } from '../components/mrkdwnSection';
import { AnyBlock } from '@slack/types';
import { AllMiddlewareArgs, SlackCommandMiddlewareArgs } from '@slack/bolt';
import { Logger } from '../utils/logger';
import { extractQuotedText, parseFlags, parseOptions, getParsingErrorMessage } from '../utils/commandParser';
import { pollFormCreate } from '../components/pollFormCreate';

export const handlePollCommand = async ({
  command,
  ack,
  client,
  body,
}: SlackCommandMiddlewareArgs & AllMiddlewareArgs): Promise<void> => {
  await ack();

  const log = new Logger({
    userId: command.user_id,
    workspaceId: command.team_id,
    functionName: 'handlePollCommand',
  });

  let parsed;
  try {
    parsed = await parseCommand(command.text || '');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown parsing error';
    log.warn('Poll command parsing failed');
    await client.chat.postEphemeral({
      channel: command.channel_id,
      user: command.user_id,
      text:
        errorMessage ||
        'Invalid format. Please use quotes around your question and provide at least 2 options. Example: /poll "Your question?" option1, option2, ...',
    });
    return;
  }

  log.info('Poll command received', { functionName: command.text });

  if (!parsed) {
    await client.chat.postEphemeral({
      channel: command.channel_id,
      user: command.user_id,
      text: 'Invalid format. Please use quotes around your question and provide at least 2 options. Example: /poll "Your question?" option1, option2, ...',
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
    return;
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
      text: 'An error occurred',
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
  const log = new Logger({
    functionName: 'parseCommand',
  });
  // Handle special commands first
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

  // Extract quoted text using the robust parser
  const quotedResult = extractQuotedText(text);
  if (!quotedResult) {
    const errorMessage = getParsingErrorMessage(text);
    log.warn('Poll command parsing failed', { metadata: { errorMessage } });
    return null;
  }

  const { question, beforeQuote, afterQuote } = quotedResult;

  // Parse flags from the keyword part before the quote
  const flagsResult = parseFlags(beforeQuote);
  const { isMultiple, isCustom, isAnonymous, maxVotes } = flagsResult;

  // Parse options from the text after the quote
  const optionsResult = parseOptions(afterQuote);
  const { options, flags } = optionsResult;

  // Only validate question and basic structure, let the main handler validate options count
  if (!question || question.trim().length === 0) {
    console.log('Command validation failed: Empty question', 'Command:', text);
    return null;
  }

  console.log('Successfully parsed command:', {
    question,
    options,
    flags: { isMultiple, isCustom, isAnonymous, maxVotes },
  });

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
