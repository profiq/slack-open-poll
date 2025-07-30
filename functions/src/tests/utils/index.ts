/**
 * Integration test utilities for Slack webhook API testing
 *
 * This module provides comprehensive utilities for testing Slack webhook integrations:
 * - Mock Slack WebClient with all API methods
 * - Test data factories for creating realistic test data
 * - Assertion helpers for verifying Slack API calls
 * - Test environment setup and teardown
 */

import { expect } from 'vitest';

// Mock infrastructure
export {
  SlackApiResponseBuilder,
  createMockSlackWebClient,
  setupDefaultSlackResponses,
  resetSlackMocks,
} from '../mocks/slackWebClient';

// Test data factories
export { TestDataFactory } from './testDataFactories';

// Assertion helpers
export { SlackApiAssertions } from './testAssertions';

// Test environment setup
import {
  TestEnvironment as _TestEnvironment,
  setupIntegrationTestEnvironment as _setupIntegrationTestEnvironment,
  ServiceMocks as _ServiceMocks,
  AsyncTestUtils as _AsyncTestUtils,
} from './testEnvironment';

export const TestEnvironment = _TestEnvironment;
export const ServiceMocks = _ServiceMocks;
export const AsyncTestUtils = _AsyncTestUtils;

/**
 * Quick setup function for basic integration tests
 *
 * @example
 * ```typescript
 * import { setupBasicIntegrationTest } from '@/tests/utils';
 *
 * describe('Poll Creation Handler', () => {
 *   const getTestEnv = setupBasicIntegrationTest();
 *
 *   it('should create a poll and post message', async () => {
 *     const testEnv = getTestEnv();
 *     // Your test code here
 *   });
 * });
 * ```
 */
export function setupBasicIntegrationTest() {
  return _setupIntegrationTestEnvironment();
}

/**
 * Common test patterns and utilities
 */
export const TestPatterns = {
  /**
   * Standard test setup for handler functions
   */
  createHandlerTestArgs: (testEnv: InstanceType<typeof TestEnvironment>, overrides?: Record<string, unknown>) => ({
    ack: testEnv.mockAck,
    client: testEnv.slackClient,
    respond: testEnv.mockRespond,
    ...overrides,
  }),

  /**
   * Common assertions for successful poll creation
   */
  assertPollCreationSuccess: (
    testEnv: InstanceType<typeof TestEnvironment>,
    expectedChannel: string,
    expectedText?: string
  ) => {
    expect(testEnv.mockAck).toHaveBeenCalledOnce();
    const expectedArgs: Record<string, unknown> = {
      channel: expectedChannel,
      text: expect.stringContaining('Poll:'),
    };

    if (expectedText) {
      expectedArgs.text = expect.stringContaining(expectedText);
    }

    expect(testEnv.slackMocks.postMessage).toHaveBeenCalledWith(expect.objectContaining(expectedArgs));
  },

  /**
   * Common assertions for error handling
   */
  assertErrorHandling: (testEnv: InstanceType<typeof TestEnvironment>, expectedErrorText?: string) => {
    expect(testEnv.mockAck).toHaveBeenCalledOnce();
    expect(testEnv.slackMocks.postEphemeral).toHaveBeenCalled();

    if (expectedErrorText) {
      const call = testEnv.slackMocks.postEphemeral.mock.calls[0][0];
      expect(call.text || '').toContain(expectedErrorText);
    }
  },
};
