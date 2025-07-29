import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SlackAction } from '@slack/bolt';
import { handleVoteAction } from '../../handlers/voteHandler';
import { PollService } from '../../services/pollService';
import { setupBasicIntegrationTest, TestDataFactory, SlackApiAssertions, ServiceMocks } from '../utils';

// Mock dependencies
vi.mock('../../services/pollService');
vi.mock('../../components/pollDisplay', () => ({
  pollDisplayBlock: vi.fn(() => [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: 'Updated poll display block',
      },
    },
  ]),
}));

describe('Vote Handling Integration Tests', () => {
  const getTestEnv = setupBasicIntegrationTest();
  let mockPollService: ReturnType<typeof ServiceMocks.createMockPollService>;

  beforeEach(() => {
    mockPollService = ServiceMocks.createMockPollService();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (PollService as any).mockImplementation(() => mockPollService);
  });

  describe('Successful Vote Submission', () => {
    it('should handle vote submission and update poll message', async () => {
      const testEnv = getTestEnv();
      const poll = TestDataFactory.createPoll({
        channelTimeStamp: '1234567890.123456',
      });

      // Setup poll service mocks
      mockPollService.getById.mockResolvedValue(poll);
      mockPollService.vote.mockResolvedValue(undefined);

      const buttonAction = TestDataFactory.createButtonAction({
        action_id: 'vote_option1',
        pollId: 'poll123',
        optionId: 'option1',
        user_id: 'U1234567890',
        channel_id: 'C1234567890',
      });

      const args = {
        ack: testEnv.mockAck,
        body: buttonAction as unknown as SlackAction,
        client: testEnv.slackClient,
      };

      await handleVoteAction(args);

      // Verify acknowledgment
      expect(testEnv.mockAck).toHaveBeenCalledOnce();

      // Verify vote was submitted
      expect(mockPollService.vote).toHaveBeenCalledWith(
        'poll123', // pollId
        expect.objectContaining({
          userId: 'U1234567890',
          optionId: 'option1',
        })
      );

      // Verify poll message was updated
      SlackApiAssertions.expectUpdateCall(testEnv.slackMocks.update, {
        channel: poll.channelId,
        ts: poll.channelTimeStamp,
        text: `Poll: ${poll.question}`,
        blocks: expect.any(Array),
      });
    });

    it('should post new message if timestamp is missing', async () => {
      const testEnv = getTestEnv();
      const poll = TestDataFactory.createPoll({
        channelTimeStamp: '', // No timestamp
      });

      mockPollService.getById.mockResolvedValue(poll);
      mockPollService.vote.mockResolvedValue(undefined);

      const buttonAction = TestDataFactory.createButtonAction({
        action_id: 'vote_option1',
        pollId: 'poll123',
        optionId: 'option1',
      });

      const args = {
        ack: testEnv.mockAck,
        body: buttonAction as unknown as SlackAction,
        client: testEnv.slackClient,
      };

      await handleVoteAction(args);

      // Should post new message instead of updating
      SlackApiAssertions.expectPostMessageCall(testEnv.slackMocks.postMessage, {
        channel: poll.channelId,
        text: `Poll: ${poll.question}`,
        blocks: expect.any(Array),
      });

      // Should not try to update
      SlackApiAssertions.expectNotCalled(testEnv.slackMocks.update);
    });

    it('should handle multiple vote options correctly', async () => {
      const testEnv = getTestEnv();
      const poll = TestDataFactory.createPoll({
        multiple: true,
        maxVotes: 2,
      });

      mockPollService.getById.mockResolvedValue(poll);
      mockPollService.vote.mockResolvedValue(undefined);

      const buttonAction = TestDataFactory.createButtonAction({
        action_id: 'vote_option2',
        pollId: 'poll123',
        optionId: 'option2',
      });

      const args = {
        ack: testEnv.mockAck,
        body: buttonAction as unknown as SlackAction,
        client: testEnv.slackClient,
      };

      await handleVoteAction(args);

      expect(mockPollService.vote).toHaveBeenCalledWith(
        'poll123',
        expect.objectContaining({
          optionId: 'option2',
        })
      );
    });
  });

  describe('Vote Validation and Error Handling', () => {
    it('should handle vote rejection with error message', async () => {
      const testEnv = getTestEnv();
      const poll = TestDataFactory.createPoll();

      mockPollService.getById.mockResolvedValue(poll);
      mockPollService.vote.mockRejectedValue(new Error('You have already voted'));

      const buttonAction = TestDataFactory.createButtonAction({
        action_id: 'vote_option1',
        pollId: 'poll123',
        optionId: 'option1',
      });

      const args = {
        ack: testEnv.mockAck,
        body: buttonAction as unknown as SlackAction,
        client: testEnv.slackClient,
      };

      await handleVoteAction(args);

      expect(testEnv.mockAck).toHaveBeenCalledOnce();

      // Should show error to user
      SlackApiAssertions.expectPostEphemeralCall(testEnv.slackMocks.postEphemeral, {
        channel: poll.channelId,
        user: buttonAction.user.id,
        text: 'You have already voted',
      });

      // Should not update poll message
      SlackApiAssertions.expectNotCalled(testEnv.slackMocks.update);
    });

    it('should handle closed poll voting attempt', async () => {
      const testEnv = getTestEnv();
      const poll = TestDataFactory.createPoll({
        closed: true,
      });

      mockPollService.getById.mockResolvedValue(poll);
      mockPollService.vote.mockRejectedValue(new Error('Poll is closed'));

      const buttonAction = TestDataFactory.createButtonAction({
        action_id: 'vote_option1',
        pollId: 'poll123',
        optionId: 'option1',
      });

      const args = {
        ack: testEnv.mockAck,
        body: buttonAction as unknown as SlackAction,
        client: testEnv.slackClient,
      };

      await handleVoteAction(args);

      SlackApiAssertions.expectPostEphemeralCall(testEnv.slackMocks.postEphemeral, {
        user: buttonAction.user.id,
        text: 'This poll has been closed',
      });
    });

    it('should handle max votes exceeded error', async () => {
      const testEnv = getTestEnv();
      const poll = TestDataFactory.createPoll({
        multiple: true,
        maxVotes: 2,
      });

      mockPollService.getById.mockResolvedValue(poll);
      mockPollService.vote.mockRejectedValue(new Error('Maximum votes exceeded'));

      const buttonAction = TestDataFactory.createButtonAction({
        action_id: 'vote_option1',
        pollId: 'poll123',
        optionId: 'option1',
      });

      const args = {
        ack: testEnv.mockAck,
        body: buttonAction as unknown as SlackAction,
        client: testEnv.slackClient,
      };

      await handleVoteAction(args);

      SlackApiAssertions.expectPostEphemeralCall(testEnv.slackMocks.postEphemeral, {
        user: buttonAction.user.id,
        text: 'Maximum votes exceeded',
      });
    });

    it('should handle poll not found error', async () => {
      const testEnv = getTestEnv();

      mockPollService.getById.mockResolvedValue(null);

      const buttonAction = TestDataFactory.createButtonAction({
        action_id: 'vote_option1',
        pollId: 'poll123',
        optionId: 'option1',
      });

      const args = {
        ack: testEnv.mockAck,
        body: buttonAction as unknown as SlackAction,
        client: testEnv.slackClient,
      };

      await handleVoteAction(args);

      expect(testEnv.mockAck).toHaveBeenCalledOnce();
      expect(mockPollService.vote).not.toHaveBeenCalled();
      SlackApiAssertions.expectNotCalled(testEnv.slackMocks.update);
    });

    it('should handle invalid action format', async () => {
      const testEnv = getTestEnv();

      const invalidAction = {
        ...TestDataFactory.createButtonAction(),
        actions: [
          {
            type: 'button',
            action_id: 'invalid_action', // Not a vote action
            value: 'invalid',
          },
        ],
      };

      const args = {
        ack: testEnv.mockAck,
        body: invalidAction as unknown as SlackAction,
        client: testEnv.slackClient,
      };

      await handleVoteAction(args);

      expect(testEnv.mockAck).toHaveBeenCalledOnce();
      expect(mockPollService.vote).not.toHaveBeenCalled();
    });
  });

  describe('Slack API Error Handling', () => {
    it('should handle message update failure gracefully', async () => {
      const testEnv = getTestEnv();
      const poll = TestDataFactory.createPoll();

      mockPollService.getById.mockResolvedValue(poll);
      mockPollService.vote.mockResolvedValue(undefined);

      // Simulate Slack API error
      testEnv.slackMocks.update.mockRejectedValue(new Error('Message not found'));

      const buttonAction = TestDataFactory.createButtonAction({
        action_id: 'vote_option1',
        pollId: 'poll123',
        optionId: 'option1',
      });

      const args = {
        ack: testEnv.mockAck,
        body: buttonAction as unknown as SlackAction,
        client: testEnv.slackClient,
      };

      await handleVoteAction(args);

      // Vote should still be processed
      expect(mockPollService.vote).toHaveBeenCalled();

      // Error should be handled gracefully (logged but not crash)
      expect(testEnv.mockAck).toHaveBeenCalledOnce();
    });

    it('should handle ephemeral message posting failure', async () => {
      const testEnv = getTestEnv();
      const poll = TestDataFactory.createPoll();

      mockPollService.getById.mockResolvedValue(poll);
      mockPollService.vote.mockRejectedValue(new Error('Already voted'));

      // Simulate ephemeral message failure
      testEnv.slackMocks.postEphemeral.mockRejectedValue(new Error('User not in channel'));

      const buttonAction = TestDataFactory.createButtonAction({
        action_id: 'vote_option1',
        pollId: 'poll123',
        optionId: 'option1',
      });

      const args = {
        ack: testEnv.mockAck,
        body: buttonAction as unknown as SlackAction,
        client: testEnv.slackClient,
      };

      await handleVoteAction(args);

      // Should still acknowledge and handle gracefully
      expect(testEnv.mockAck).toHaveBeenCalledOnce();
    });
  });
});
