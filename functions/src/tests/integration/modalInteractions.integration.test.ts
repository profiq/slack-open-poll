import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleFormCreation } from '../../handlers/customFormHandler';
import { handleCustomOptionSubmit } from '../../handlers/customOptionSubmitHandler';
import { PollService } from '../../services/pollService';
import { setupBasicIntegrationTest, TestDataFactory, SlackApiAssertions, ServiceMocks, TestPatterns } from '../utils';

// Mock dependencies
vi.mock('../../services/pollService');
vi.mock('../../components/pollDisplay', () => ({
  pollDisplayBlock: vi.fn(() => [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: 'Updated poll with new option',
      },
    },
  ]),
}));

describe('Modal Interactions Integration Tests', () => {
  const getTestEnv = setupBasicIntegrationTest();
  let mockPollService: ReturnType<typeof ServiceMocks.createMockPollService>;

  beforeEach(() => {
    mockPollService = ServiceMocks.createMockPollService();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (PollService as any).mockImplementation(() => mockPollService);
  });

  describe('Custom Option Form Creation', () => {
    it('should open custom option form modal', async () => {
      const testEnv = getTestEnv();

      const buttonAction = TestDataFactory.createButtonAction({
        action_id: 'open_custom_form',
        value: 'poll123',
        trigger_id: 'trigger123.456.789',
      });

      const args = TestPatterns.createHandlerTestArgs(testEnv, {
        body: buttonAction,
        action: buttonAction.actions[0],
      });

      await handleFormCreation(args);

      expect(testEnv.mockAck).toHaveBeenCalledOnce();

      // Verify modal was opened
      SlackApiAssertions.expectViewsOpenCall(testEnv.slackMocks.viewsOpen, {
        trigger_id: 'trigger123.456.789',
        view: expect.objectContaining({
          type: 'modal',
          callback_id: 'custom_option_submit',
          private_metadata: 'poll123',
          title: expect.objectContaining({
            text: 'Add Another Option',
          }),
          blocks: expect.arrayContaining([
            expect.objectContaining({
              type: 'input',
              block_id: 'option_block',
            }),
          ]),
        }),
      });
    });

    it('should handle missing trigger_id error', async () => {
      const testEnv = getTestEnv();

      const buttonAction = TestDataFactory.createButtonAction({
        action_id: 'open_custom_form',
        value: 'poll123',
        trigger_id: undefined, // Missing trigger_id
      });

      const args = TestPatterns.createHandlerTestArgs(testEnv, {
        body: { ...buttonAction, trigger_id: undefined },
        action: buttonAction.actions[0],
      });

      await expect(handleFormCreation(args)).rejects.toThrow('Missing trigger id');

      expect(testEnv.mockAck).toHaveBeenCalledOnce();
      SlackApiAssertions.expectNotCalled(testEnv.slackMocks.viewsOpen);
    });

    it('should handle views.open API error', async () => {
      const testEnv = getTestEnv();

      // Simulate Slack API error
      testEnv.slackMocks.viewsOpen.mockRejectedValue(new Error('Invalid trigger_id'));

      const buttonAction = TestDataFactory.createButtonAction({
        action_id: 'open_custom_form',
        value: 'poll123',
      });

      const args = TestPatterns.createHandlerTestArgs(testEnv, {
        body: buttonAction,
        action: buttonAction.actions[0],
      });

      await handleFormCreation(args);

      expect(testEnv.mockAck).toHaveBeenCalledOnce();
      expect(testEnv.slackMocks.viewsOpen).toHaveBeenCalled();
      // Error should be handled gracefully (logged but not crash)
    });
  });

  describe('Custom Option Submission', () => {
    it('should add custom option and update poll message', async () => {
      const testEnv = getTestEnv();

      const poll = TestDataFactory.createPoll({
        channelId: 'C1234567890',
        channelTimeStamp: '1234567890.123456',
      });

      const updatedPoll = {
        ...poll,
        options: [
          ...poll.options,
          TestDataFactory.createPollOption({
            id: 'new-option-id',
            label: 'Custom Option',
          }),
        ],
      };

      // Mock the transaction methods
      mockPollService.runTransaction.mockImplementation(async (callback) => {
        return callback({});
      });
      mockPollService.getInTransaction.mockResolvedValue(poll);
      mockPollService.updateInTransaction.mockResolvedValue(undefined);

      const viewSubmission = TestDataFactory.createViewSubmission({
        callback_id: 'custom_option_submit',
        private_metadata: 'poll123',
        values: {
          option_block: {
            option_input: {
              type: 'plain_text_input',
              value: 'Custom Option',
            },
          },
        },
      });

      const args = TestPatterns.createHandlerTestArgs(testEnv, {
        view: viewSubmission.view,
        body: viewSubmission,
      });

      await handleCustomOptionSubmit(args);

      expect(testEnv.mockAck).toHaveBeenCalledOnce();

      // Verify transaction methods were called
      expect(mockPollService.runTransaction).toHaveBeenCalled();
      expect(mockPollService.getInTransaction).toHaveBeenCalledWith(expect.anything(), 'poll123');
      expect(mockPollService.updateInTransaction).toHaveBeenCalledWith(
        expect.anything(),
        'poll123',
        expect.objectContaining({
          options: expect.arrayContaining([expect.objectContaining({ label: 'Custom Option' })]),
        })
      );

      // Verify poll message was updated
      SlackApiAssertions.expectUpdateCall(testEnv.slackMocks.update, {
        channel: poll.channelId,
        ts: poll.channelTimeStamp,
        blocks: expect.any(Array),
      });
    });

    it('should handle empty option value error', async () => {
      const testEnv = getTestEnv();

      const viewSubmission = TestDataFactory.createViewSubmission({
        callback_id: 'custom_option_submit',
        private_metadata: 'poll123',
        values: {
          option_block: {
            option_input: {
              type: 'plain_text_input',
              value: '', // Empty value
            },
          },
        },
      });

      const args = TestPatterns.createHandlerTestArgs(testEnv, {
        view: viewSubmission.view,
        body: viewSubmission,
      });

      await expect(handleCustomOptionSubmit(args)).rejects.toThrow('Option value is missing');

      expect(testEnv.mockAck).toHaveBeenCalledOnce();
      expect(mockPollService.runTransaction).not.toHaveBeenCalled();
    });

    it('should handle missing channel information', async () => {
      const testEnv = getTestEnv();

      const poll = TestDataFactory.createPoll({
        channelId: '', // Missing channel ID
        channelTimeStamp: '',
      });

      // Mock the transaction methods
      mockPollService.runTransaction.mockImplementation(async (callback) => {
        return callback({});
      });
      mockPollService.getInTransaction.mockResolvedValue(poll);
      mockPollService.updateInTransaction.mockResolvedValue(undefined);

      const viewSubmission = TestDataFactory.createViewSubmission({
        callback_id: 'custom_option_submit',
        private_metadata: 'poll123',
        values: {
          option_block: {
            option_input: {
              type: 'plain_text_input',
              value: 'Custom Option',
            },
          },
        },
      });

      const args = TestPatterns.createHandlerTestArgs(testEnv, {
        view: viewSubmission.view,
        body: viewSubmission,
      });

      await handleCustomOptionSubmit(args);

      expect(testEnv.mockAck).toHaveBeenCalledOnce();
      expect(mockPollService.runTransaction).toHaveBeenCalled();

      // Should not try to update message without channel info
      SlackApiAssertions.expectNotCalled(testEnv.slackMocks.update);
    });

    it('should handle poll service error', async () => {
      const testEnv = getTestEnv();

      mockPollService.runTransaction.mockRejectedValue(new Error('Poll not found'));

      const viewSubmission = TestDataFactory.createViewSubmission({
        callback_id: 'custom_option_submit',
        private_metadata: 'poll123',
        values: {
          option_block: {
            option_input: {
              type: 'plain_text_input',
              value: 'Custom Option',
            },
          },
        },
      });

      const args = TestPatterns.createHandlerTestArgs(testEnv, {
        view: viewSubmission.view,
        body: viewSubmission,
      });

      await handleCustomOptionSubmit(args);

      expect(testEnv.mockAck).toHaveBeenCalledOnce();
      expect(mockPollService.runTransaction).toHaveBeenCalled();

      // Should handle error gracefully
      SlackApiAssertions.expectNotCalled(testEnv.slackMocks.update);
    });

    it('should handle message update failure', async () => {
      const testEnv = getTestEnv();

      const poll = TestDataFactory.createPoll({
        channelId: 'C1234567890',
        channelTimeStamp: '1234567890.123456',
      });

      // Mock the transaction methods
      mockPollService.runTransaction.mockImplementation(async (callback) => {
        return callback({});
      });
      mockPollService.getInTransaction.mockResolvedValue(poll);
      mockPollService.updateInTransaction.mockResolvedValue(undefined);

      // Simulate message update failure
      testEnv.slackMocks.update.mockRejectedValue(new Error('Message not found'));

      const viewSubmission = TestDataFactory.createViewSubmission({
        callback_id: 'custom_option_submit',
        private_metadata: 'poll123',
        values: {
          option_block: {
            option_input: {
              type: 'plain_text_input',
              value: 'Custom Option',
            },
          },
        },
      });

      const args = TestPatterns.createHandlerTestArgs(testEnv, {
        view: viewSubmission.view,
        body: viewSubmission,
      });

      await handleCustomOptionSubmit(args);

      expect(testEnv.mockAck).toHaveBeenCalledOnce();
      expect(mockPollService.runTransaction).toHaveBeenCalled();
      expect(testEnv.slackMocks.update).toHaveBeenCalled();

      // Error should be handled gracefully
    });
  });
});
