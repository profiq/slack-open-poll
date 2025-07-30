# Slack Webhook Integration Testing Guide

This guide explains how to use the comprehensive integration testing infrastructure for Slack webhook API calls in the slack-open-poll project.

## Overview

The integration testing infrastructure provides:

- **Mock Slack WebClient** with all API methods (chat, views, conversations)
- **Test data factories** for creating realistic test data
- **Assertion helpers** for verifying Slack API calls
- **Test environment setup** and teardown utilities
- **Sample integration tests** demonstrating best practices

## Quick Start

### Basic Test Setup

```typescript
import { describe, it, expect } from 'vitest';
import { setupBasicIntegrationTest, TestDataFactory, SlackApiAssertions } from '../utils';
import { handlePollCommand } from '../../handlers/pollCreationHandler';

describe('Poll Creation Tests', () => {
  const getTestEnv = setupBasicIntegrationTest();

  it('should create a poll and post to Slack', async () => {
    const testEnv = getTestEnv();
    const command = TestDataFactory.createSlashCommand({
      text: '"What is your favorite color?" Red, Blue, Green',
    });

    await handlePollCommand({
      command,
      ack: testEnv.mockAck,
      client: testEnv.slackClient,
      body: {},
    });

    // Verify the handler acknowledged the command
    expect(testEnv.mockAck).toHaveBeenCalledOnce();

    // Verify message was posted to Slack
    SlackApiAssertions.expectPostMessageCall(testEnv.slackMocks.postMessage, {
      channel: command.channel_id,
      text: expect.stringContaining('Poll:'),
    });
  });
});
```

## Core Components

### 1. Test Environment Setup

The `TestEnvironment` class provides a complete testing environment:

```typescript
import { TestEnvironment } from '../utils/testEnvironment';

const testEnv = new TestEnvironment();
testEnv.setup(); // Sets up all mocks with default responses

// Access mocked Slack client
testEnv.slackClient.chat.postMessage(/* ... */);

// Access individual mock functions
testEnv.slackMocks.postMessage.mockResolvedValue(/* custom response */);
```

### 2. Test Data Factories

Create realistic test data easily:

```typescript
import { TestDataFactory } from '../utils/testDataFactories';

// Create a slash command
const command = TestDataFactory.createSlashCommand({
  text: '"Your question?" Option1, Option2',
  user_id: 'U123456',
  channel_id: 'C123456',
});

// Create a poll object
const poll = TestDataFactory.createPoll({
  question: 'Test question?',
  multiple: true,
  maxVotes: 2,
});

// Create button action payload
const buttonAction = TestDataFactory.createButtonAction({
  action_id: 'vote_option1',
  value: 'option1',
});

// Create view submission payload
const viewSubmission = TestDataFactory.createViewSubmission({
  callback_id: 'custom_option_submit',
  values: {
    option_block: {
      option_input: { value: 'New Option' },
    },
  },
});
```

### 3. Slack API Assertions

Verify Slack API calls with detailed assertions:

```typescript
import { SlackApiAssertions } from '../utils/testAssertions';

// Verify chat.postMessage was called
SlackApiAssertions.expectPostMessageCall(mockPostMessage, {
  channel: 'C123456',
  text: 'Expected message text',
  blocks: expect.any(Array),
});

// Verify chat.update was called
SlackApiAssertions.expectUpdateCall(mockUpdate, {
  channel: 'C123456',
  ts: '1234567890.123456',
  blocks: expect.any(Array),
});

// Verify views.open was called
SlackApiAssertions.expectViewsOpenCall(mockViewsOpen, {
  trigger_id: 'trigger123',
  view: expect.objectContaining({
    type: 'modal',
    callback_id: 'test_modal',
  }),
});

// Verify blocks contain specific content
SlackApiAssertions.expectBlocksContainText(blocks, 'Expected text');
SlackApiAssertions.expectBlocksContainButton(blocks, 'vote_option1');
```

### 4. Mock Response Builders

Create realistic Slack API responses:

```typescript
import { SlackApiResponseBuilder } from '../mocks/slackWebClient';

// Create successful responses
const postMessageResponse = SlackApiResponseBuilder.chatPostMessage({
  ts: '1234567890.123456',
  channel: 'C123456',
});

const viewsOpenResponse = SlackApiResponseBuilder.viewsOpen({
  view: { id: 'V123456' },
});

// Create error responses
const errorResponse = SlackApiResponseBuilder.error('not_in_channel');

// Use in tests
testEnv.slackMocks.postMessage.mockResolvedValue(postMessageResponse);
```

## Testing Patterns

### 1. Handler Function Testing

```typescript
describe('Poll Handler', () => {
  const getTestEnv = setupBasicIntegrationTest();

  it('should handle poll creation', async () => {
    const testEnv = getTestEnv();
    const command = TestDataFactory.createSlashCommand();

    const args = TestPatterns.createHandlerTestArgs(testEnv, {
      command,
      body: {},
    });

    await handlePollCommand(args);

    TestPatterns.assertPollCreationSuccess(testEnv, command.channel_id, 'Expected poll text');
  });
});
```

### 2. Error Handling Testing

```typescript
it('should handle Slack API errors gracefully', async () => {
  const testEnv = getTestEnv();

  // Simulate API error
  testEnv.slackMocks.postMessage.mockRejectedValue(new Error('API Error'));

  const command = TestDataFactory.createSlashCommand();
  await handlePollCommand({ command, ack: testEnv.mockAck, client: testEnv.slackClient });

  // Verify error was handled
  expect(testEnv.mockAck).toHaveBeenCalled();
  TestPatterns.assertErrorHandling(testEnv, 'Expected error message');
});
```

### 3. Service Integration Testing

```typescript
import { ServiceMocks } from '../utils/testEnvironment';

beforeEach(() => {
  const mockPollService = ServiceMocks.createMockPollService();
  const mockDocRef = ServiceMocks.createMockDocumentRef();
  const mockPoll = TestDataFactory.createPoll();

  mockDocRef.get.mockResolvedValue(ServiceMocks.createMockDocumentSnapshot(mockPoll));
  mockPollService.create.mockResolvedValue(mockDocRef);
});
```

## Advanced Testing Scenarios

### 1. Testing API Rate Limits

```typescript
it('should handle rate limiting', async () => {
  const testEnv = getTestEnv();
  testEnv.simulateRateLimit('postMessage');

  // Your test code here
});
```

### 2. Testing Network Timeouts

```typescript
it('should handle timeouts', async () => {
  const testEnv = getTestEnv();
  testEnv.simulateTimeout('postMessage', 5000);

  // Your test code here
});
```

### 3. Testing Complex Workflows

```typescript
it('should handle complete poll workflow', async () => {
  const testEnv = getTestEnv();

  // 1. Create poll
  await handlePollCommand(/* ... */);

  // 2. Vote on poll
  await handleVoteAction(/* ... */);

  // 3. Close poll
  await handleClosePoll(/* ... */);

  // Verify the sequence of API calls
  SlackApiAssertions.expectCallSequence([
    { mock: testEnv.slackMocks.postMessage, method: 'postMessage' },
    { mock: testEnv.slackMocks.update, method: 'update' },
    { mock: testEnv.slackMocks.postMessage, method: 'postMessage' },
  ]);
});
```

## Running Tests

```bash
# Run all tests
npm test

# Run integration tests only
npm test -- --grep "integration"

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

## Best Practices

1. **Use setupBasicIntegrationTest()** for consistent test environment setup
2. **Mock external services** (PollService, Firestore) using ServiceMocks
3. **Test both success and error scenarios** for comprehensive coverage
4. **Use TestDataFactory** for consistent test data creation
5. **Verify API calls with SlackApiAssertions** for detailed validation
6. **Test complete workflows** not just individual functions
7. **Reset mocks between tests** to avoid test interference

## File Structure

```
functions/src/tests/
├── README.md                           # This documentation
├── integration/                        # Integration test files
│   ├── pollCreation.integration.test.ts
│   ├── voteHandling.integration.test.ts
│   └── modalInteractions.integration.test.ts
├── mocks/                             # Mock implementations
│   └── slackWebClient.ts              # Slack API mocks
└── utils/                             # Test utilities
    ├── index.ts                       # Main exports
    ├── testDataFactories.ts           # Test data creation
    ├── testAssertions.ts              # Assertion helpers
    └── testEnvironment.ts             # Test environment setup
```

## Common Testing Scenarios

### Testing Poll Creation

```typescript
it('should create poll with multiple options', async () => {
  const testEnv = getTestEnv();
  const command = TestDataFactory.createSlashCommand({
    text: '"Pick colors?" -m Red, Blue, Green',
  });

  await handlePollCommand({
    command,
    ack: testEnv.mockAck,
    client: testEnv.slackClient,
    body: {},
  });

  SlackApiAssertions.expectPostMessageCall(testEnv.slackMocks.postMessage, {
    channel: command.channel_id,
    blocks: expect.arrayContaining([
      expect.objectContaining({
        type: 'actions',
        elements: expect.arrayContaining([expect.objectContaining({ action_id: expect.stringMatching(/^vote_/) })]),
      }),
    ]),
  });
});
```

### Testing Vote Handling

```typescript
it('should update poll after vote', async () => {
  const testEnv = getTestEnv();
  const poll = TestDataFactory.createPoll();

  mockPollService.getById.mockResolvedValue(poll);
  mockPollService.vote.mockResolvedValue(undefined);

  const buttonAction = TestDataFactory.createButtonAction({
    action_id: 'vote_option1',
    value: 'option1',
  });

  await handleVoteAction({
    ack: testEnv.mockAck,
    client: testEnv.slackClient,
    body: buttonAction,
    action: buttonAction.actions[0],
  });

  SlackApiAssertions.expectUpdateCall(testEnv.slackMocks.update, {
    channel: poll.channelId,
    ts: poll.channelTimeStamp,
  });
});
```

### Testing Modal Interactions

```typescript
it('should open custom option modal', async () => {
  const testEnv = getTestEnv();
  const buttonAction = TestDataFactory.createButtonAction({
    action_id: 'open_custom_form',
    value: 'poll123',
  });

  await handleFormCreation({
    ack: testEnv.mockAck,
    client: testEnv.slackClient,
    body: buttonAction,
    action: buttonAction.actions[0],
  });

  SlackApiAssertions.expectViewsOpenCall(testEnv.slackMocks.viewsOpen, {
    trigger_id: buttonAction.trigger_id,
    view: expect.objectContaining({
      callback_id: 'custom_option_submit',
      private_metadata: 'poll123',
    }),
  });
});
```

## Contributing

When adding new integration tests:

1. Follow the existing patterns and structure
2. Add comprehensive error handling tests
3. Update this documentation if adding new utilities
4. Ensure tests are isolated and don't depend on external services
5. Use descriptive test names and organize tests logically
