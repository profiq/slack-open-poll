import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handlePollCommand } from '../../handlers/pollCreationHandler';
import { PollService } from '../../services/pollService';
import { setupBasicIntegrationTest, TestDataFactory, SlackApiAssertions, ServiceMocks, TestPatterns } from '../utils';

// Mock the PollService
vi.mock('../../services/pollService');
vi.mock('../../components/pollDisplay', () => ({
  pollDisplayBlock: vi.fn(() => [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: 'Mock poll display block',
      },
    },
  ]),
}));

describe('Poll Creation Integration Tests', () => {
  const getTestEnv = setupBasicIntegrationTest();
  let mockPollService: ReturnType<typeof ServiceMocks.createMockPollService>;

  let mockDocRef: ReturnType<typeof ServiceMocks.createMockDocumentRef>;

  beforeEach(() => {
    mockPollService = ServiceMocks.createMockPollService();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (PollService as any).mockImplementation(() => mockPollService);

    // Setup default poll service responses
    mockDocRef = ServiceMocks.createMockDocumentRef();
    const mockPoll = TestDataFactory.createPoll();
    const mockDocSnap = ServiceMocks.createMockDocumentSnapshot(mockPoll);

    mockDocRef.get.mockResolvedValue(mockDocSnap);
    mockDocRef.update.mockResolvedValue(undefined);
    mockPollService.create.mockResolvedValue(mockDocRef);
  });

  describe('Successful Poll Creation', () => {
    it('should create a simple poll and post message to Slack', async () => {
      const testEnv = getTestEnv();
      const command = TestDataFactory.createSlashCommand({
        text: '"What is your favorite color?" Red, Blue, Green',
      });

      const args = TestPatterns.createHandlerTestArgs(testEnv, {
        command,
        body: {},
      });

      await handlePollCommand(args);

      // Verify the handler acknowledged the command
      expect(testEnv.mockAck).toHaveBeenCalledOnce();

      // Verify poll was created in the service
      expect(mockPollService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          question: 'What is your favorite color?',
          options: expect.arrayContaining([
            expect.objectContaining({ label: 'Red' }),
            expect.objectContaining({ label: 'Blue' }),
            expect.objectContaining({ label: 'Green' }),
          ]),
          createdBy: command.user_id,
          channelId: command.channel_id,
          multiple: false,
          custom: false,
          anonymous: false,
        })
      );

      // Verify message was posted to Slack
      SlackApiAssertions.expectPostMessageCall(testEnv.slackMocks.postMessage, {
        channel: command.channel_id,
        text: 'Poll: What is your favorite color?',
        blocks: expect.any(Array),
      });

      // Verify poll timestamp was updated
      expect(mockDocRef.update).toHaveBeenCalledWith({
        channelTimeStamp: expect.any(String),
      });
    });

    it('should create a multi-choice poll with max votes', async () => {
      const testEnv = getTestEnv();
      const command = TestDataFactory.createSlashCommand({
        text: 'multiple limit 2 "Pick your top 2 hobbies" Reading, Gaming, Sports, Cooking',
      });

      const args = TestPatterns.createHandlerTestArgs(testEnv, {
        command,
        body: {},
      });

      await handlePollCommand(args);

      expect(mockPollService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          question: 'Pick your top 2 hobbies',
          multiple: true,
          maxVotes: 2,
          options: expect.arrayContaining([
            expect.objectContaining({ label: 'Reading' }),
            expect.objectContaining({ label: 'Gaming' }),
            expect.objectContaining({ label: 'Sports' }),
            expect.objectContaining({ label: 'Cooking' }),
          ]),
        })
      );

      // Just verify that a message was posted - the exact text depends on the mock poll display
      expect(testEnv.mockAck).toHaveBeenCalledOnce();
      SlackApiAssertions.expectPostMessageCall(testEnv.slackMocks.postMessage, {
        channel: command.channel_id,
        text: expect.stringContaining('Poll:'),
      });
    });

    it('should create an anonymous custom poll', async () => {
      const testEnv = getTestEnv();
      const command = TestDataFactory.createSlashCommand({
        text: 'anonymous custom "Anonymous feedback?" Good, Bad, Neutral',
      });

      const args = TestPatterns.createHandlerTestArgs(testEnv, {
        command,
        body: {},
      });

      await handlePollCommand(args);

      expect(mockPollService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          question: 'Anonymous feedback?',
          anonymous: true,
          custom: true,
          options: expect.arrayContaining([
            expect.objectContaining({ label: 'Good' }),
            expect.objectContaining({ label: 'Bad' }),
            expect.objectContaining({ label: 'Neutral' }),
          ]),
        })
      );
    });
  });

  describe('Help and Info Commands', () => {
    it('should show help message when help is requested', async () => {
      const testEnv = getTestEnv();
      const command = TestDataFactory.createSlashCommand({
        text: 'help',
      });

      const args = TestPatterns.createHandlerTestArgs(testEnv, {
        command,
        body: {},
      });

      await handlePollCommand(args);

      expect(testEnv.mockAck).toHaveBeenCalledOnce();
      SlackApiAssertions.expectPostEphemeralCall(testEnv.slackMocks.postEphemeral, {
        channel: command.channel_id,
        user: command.user_id,
        blocks: expect.any(Array),
      });

      // Verify no poll was created
      expect(mockPollService.create).not.toHaveBeenCalled();
    });

    it('should show info message when info is requested', async () => {
      const testEnv = getTestEnv();
      const command = TestDataFactory.createSlashCommand({
        text: 'info',
      });

      const args = TestPatterns.createHandlerTestArgs(testEnv, {
        command,
        body: {},
      });

      await handlePollCommand(args);

      expect(testEnv.mockAck).toHaveBeenCalledOnce();
      SlackApiAssertions.expectPostEphemeralCall(testEnv.slackMocks.postEphemeral, {
        channel: command.channel_id,
        user: command.user_id,
        blocks: expect.any(Array),
      });
    });

    it('should open create form when create is requested', async () => {
      const testEnv = getTestEnv();
      const command = TestDataFactory.createSlashCommand({
        text: 'create',
      });

      const args = TestPatterns.createHandlerTestArgs(testEnv, {
        command,
        body: { trigger_id: 'trigger123.456.789' },
      });

      await handlePollCommand(args);

      expect(testEnv.mockAck).toHaveBeenCalledOnce();
      SlackApiAssertions.expectViewsOpenCall(testEnv.slackMocks.viewsOpen, {
        trigger_id: 'trigger123.456.789',
        view: expect.objectContaining({
          type: 'modal',
          callback_id: expect.any(String),
        }),
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid command format', async () => {
      const testEnv = getTestEnv();
      const command = TestDataFactory.createSlashCommand({
        text: 'invalid command format',
      });

      const args = TestPatterns.createHandlerTestArgs(testEnv, {
        command,
        body: {},
      });

      await handlePollCommand(args);

      TestPatterns.assertErrorHandling(testEnv, 'Invalid format');
      expect(mockPollService.create).not.toHaveBeenCalled();
    });

    it('should handle insufficient options error', async () => {
      const testEnv = getTestEnv();
      const command = TestDataFactory.createSlashCommand({
        text: '"Question with one option?" OnlyOne',
      });

      const args = TestPatterns.createHandlerTestArgs(testEnv, {
        command,
        body: {},
      });

      await handlePollCommand(args);

      TestPatterns.assertErrorHandling(testEnv, 'at least 2 options');
      expect(mockPollService.create).not.toHaveBeenCalled();
    });

    it('should handle poll service creation error', async () => {
      const testEnv = getTestEnv();
      const command = TestDataFactory.createSlashCommand({
        text: '"Valid question?" Option1, Option2',
      });

      // Simulate service error
      mockPollService.create.mockRejectedValue(new Error('Database error'));

      const args = TestPatterns.createHandlerTestArgs(testEnv, {
        command,
        body: {},
      });

      await handlePollCommand(args);

      expect(testEnv.mockAck).toHaveBeenCalledOnce();
      SlackApiAssertions.expectPostEphemeralCall(testEnv.slackMocks.postEphemeral, {
        channel: command.channel_id,
        user: command.user_id,
        text: 'An error occurrred',
      });
    });

    it('should handle Slack API posting error', async () => {
      const testEnv = getTestEnv();
      const command = TestDataFactory.createSlashCommand();

      // Simulate Slack API error
      testEnv.slackMocks.postMessage.mockRejectedValue(new Error('Slack API error'));

      const args = TestPatterns.createHandlerTestArgs(testEnv, {
        command,
        body: {},
      });

      await handlePollCommand(args);

      expect(testEnv.mockAck).toHaveBeenCalledOnce();
      expect(mockPollService.create).toHaveBeenCalled();

      // The error should be logged but not necessarily shown to user
      // depending on implementation
    });
  });
});
