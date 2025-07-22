import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { initializeTestEnvironment, TestEnvironment } from '@firebase/rules-unit-testing';
import axios from 'axios';
import { slackCommandPayload } from '../fixtures/slackPayloads';

let testEnv: TestEnvironment;
const LOCAL_API_URL = 'http://localhost:5001/ano/us-central1/slack/events';

describe('Poll Creation Integration Tests', () => {
  beforeAll(async () => {
    // Set up Firebase emulators
    testEnv = await initializeTestEnvironment({
      projectId: 'test-project',
      firestore: { host: 'localhost', port: 8080 },
    });

    // Start functions emulator if needed
    // This might require a separate setup with firebase-tools
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  it('should create a poll when receiving a valid /poll command', async () => {
    // Arrange: Create a mock Slack command payload
    const payload = slackCommandPayload({
      command: '/poll',
      text: '"Do you like testing?" "Yes" "No" "Maybe"',
      user_id: 'U123ABC',
      channel_id: 'C456DEF',
    });

    // Act: Send the request to the local API endpoint
    const response = await axios.post(LOCAL_API_URL, payload, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    // Assert: Verify the response and Firestore state
    expect(response.status).toBe(200);

    // Check Firestore for the created poll
    const pollsRef = testEnv.firestore().collection('polls');
    const snapshot = await pollsRef.where('channelId', '==', 'C456DEF').get();

    expect(snapshot.empty).toBe(false);
    const poll = snapshot.docs[0].data();
    expect(poll.question).toBe('Do you like testing?');
    expect(poll.options).toHaveLength(3);
    expect(poll.createdBy).toBe('U123ABC');
  });
});
