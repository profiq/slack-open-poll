import { expect, Mock } from 'vitest';
import { AnyBlock } from '@slack/types';

// Test-friendly interfaces that include commonly used properties
interface TestChatPostMessageArgs {
  channel?: string;
  text?: string | unknown; // Allow for expect matchers
  blocks?: AnyBlock[];
  thread_ts?: string;
}

interface TestChatUpdateArgs {
  channel?: string;
  ts?: string;
  text?: string;
  blocks?: AnyBlock[];
}

interface TestChatPostEphemeralArgs {
  channel?: string;
  user?: string;
  text?: string;
  blocks?: AnyBlock[];
}

interface TestViewsOpenArgs {
  trigger_id?: string;
  view?: Record<string, unknown>;
}

interface TestViewsUpdateArgs {
  view_id?: string;
  view?: Record<string, unknown>;
  hash?: string;
}

/**
 * Custom assertion helpers for Slack API integration tests
 */
export class SlackApiAssertions {
  /**
   * Asserts that chat.postMessage was called with expected parameters
   */
  static expectPostMessageCall(mockFn: Mock, expectedArgs: TestChatPostMessageArgs, callIndex = 0) {
    expect(mockFn).toHaveBeenCalledTimes(callIndex + 1);
    const actualCall = mockFn.mock.calls[callIndex][0];

    if (expectedArgs.channel) {
      expect(actualCall.channel).toBe(expectedArgs.channel);
    }

    if (expectedArgs.text) {
      if (typeof expectedArgs.text === 'string') {
        expect(actualCall.text).toBe(expectedArgs.text);
      } else {
        // Handle expect.stringContaining and other matchers
        expect(actualCall.text).toEqual(expectedArgs.text);
      }
    }

    if (expectedArgs.blocks) {
      expect(actualCall.blocks).toEqual(expectedArgs.blocks);
    }

    if (expectedArgs.thread_ts) {
      expect(actualCall.thread_ts).toBe(expectedArgs.thread_ts);
    }

    return actualCall;
  }

  /**
   * Asserts that chat.update was called with expected parameters
   */
  static expectUpdateCall(mockFn: Mock, expectedArgs: TestChatUpdateArgs, callIndex = 0) {
    expect(mockFn).toHaveBeenCalledTimes(callIndex + 1);
    const actualCall = mockFn.mock.calls[callIndex][0];

    if (expectedArgs.channel) {
      expect(actualCall.channel).toBe(expectedArgs.channel);
    }

    if (expectedArgs.ts) {
      expect(actualCall.ts).toBe(expectedArgs.ts);
    }

    if (expectedArgs.text) {
      expect(actualCall.text).toBe(expectedArgs.text);
    }

    if (expectedArgs.blocks) {
      expect(actualCall.blocks).toEqual(expectedArgs.blocks);
    }

    return actualCall;
  }

  /**
   * Asserts that chat.postEphemeral was called with expected parameters
   */
  static expectPostEphemeralCall(mockFn: Mock, expectedArgs: TestChatPostEphemeralArgs, callIndex = 0) {
    expect(mockFn).toHaveBeenCalledTimes(callIndex + 1);
    const actualCall = mockFn.mock.calls[callIndex][0];

    if (expectedArgs.channel) {
      expect(actualCall.channel).toBe(expectedArgs.channel);
    }

    if (expectedArgs.user) {
      expect(actualCall.user).toBe(expectedArgs.user);
    }

    if (expectedArgs.text) {
      expect(actualCall.text).toBe(expectedArgs.text);
    }

    if (expectedArgs.blocks) {
      expect(actualCall.blocks).toEqual(expectedArgs.blocks);
    }

    return actualCall;
  }

  /**
   * Asserts that views.open was called with expected parameters
   */
  static expectViewsOpenCall(mockFn: Mock, expectedArgs: TestViewsOpenArgs, callIndex = 0) {
    expect(mockFn).toHaveBeenCalledTimes(callIndex + 1);
    const actualCall = mockFn.mock.calls[callIndex][0];

    if (expectedArgs.trigger_id) {
      expect(actualCall.trigger_id).toBe(expectedArgs.trigger_id);
    }

    if (expectedArgs.view) {
      expect(actualCall.view).toEqual(expectedArgs.view);
    }

    return actualCall;
  }

  /**
   * Asserts that views.update was called with expected parameters
   */
  static expectViewsUpdateCall(mockFn: Mock, expectedArgs: TestViewsUpdateArgs, callIndex = 0) {
    expect(mockFn).toHaveBeenCalledTimes(callIndex + 1);
    const actualCall = mockFn.mock.calls[callIndex][0];

    if (expectedArgs.view_id) {
      expect(actualCall.view_id).toBe(expectedArgs.view_id);
    }

    if (expectedArgs.view) {
      expect(actualCall.view).toEqual(expectedArgs.view);
    }

    if (expectedArgs.hash) {
      expect(actualCall.hash).toBe(expectedArgs.hash);
    }

    return actualCall;
  }

  /**
   * Asserts that a Slack API method was not called
   */
  static expectNotCalled(mockFn: Mock) {
    expect(mockFn).not.toHaveBeenCalled();
  }

  /**
   * Asserts that blocks contain specific content
   */
  static expectBlocksContainText(blocks: AnyBlock[], expectedText: string) {
    const blockTexts = this.extractTextFromBlocks(blocks);
    const containsText = blockTexts.some((text) => text.toLowerCase().includes(expectedText.toLowerCase()));
    expect(containsText).toBe(true);
  }

  /**
   * Asserts that blocks contain a button with specific action_id
   */
  static expectBlocksContainButton(blocks: AnyBlock[], actionId: string) {
    const hasButton = blocks.some((block) => {
      if (block.type === 'actions' && 'elements' in block) {
        return block.elements.some(
          (element) => element.type === 'button' && 'action_id' in element && element.action_id === actionId
        );
      }
      return false;
    });
    expect(hasButton).toBe(true);
  }

  /**
   * Asserts that blocks contain a section with specific text
   */
  static expectBlocksContainSection(blocks: AnyBlock[], expectedText: string) {
    const hasSection = blocks.some((block) => {
      if (block.type === 'section' && 'text' in block && block.text) {
        const text = 'text' in block.text ? block.text.text : '';
        return text.includes(expectedText);
      }
      return false;
    });
    expect(hasSection).toBe(true);
  }

  /**
   * Extracts all text content from blocks for assertion purposes
   */
  private static extractTextFromBlocks(blocks: AnyBlock[]): string[] {
    const texts: string[] = [];

    blocks.forEach((block) => {
      if (block.type === 'section' && 'text' in block && block.text) {
        if ('text' in block.text) {
          texts.push(block.text.text);
        }
      }

      if (block.type === 'actions' && 'elements' in block) {
        block.elements.forEach((element) => {
          if (element.type === 'button' && 'text' in element && element.text) {
            if ('text' in element.text) {
              texts.push(element.text.text);
            }
          }
        });
      }

      if ('fields' in block && Array.isArray(block.fields)) {
        block.fields.forEach((field) => {
          if ('text' in field) {
            texts.push(field.text);
          }
        });
      }
    });

    return texts;
  }

  /**
   * Asserts that an error response was sent to the user
   */
  static expectErrorResponse(mockFn: Mock, expectedErrorText?: string) {
    expect(mockFn).toHaveBeenCalled();
    const call = mockFn.mock.calls[mockFn.mock.calls.length - 1][0];

    if (expectedErrorText) {
      const hasErrorText =
        call.text?.includes(expectedErrorText) ||
        (call.blocks &&
          this.extractTextFromBlocks(call.blocks).some((text: string) =>
            text.toLowerCase().includes(expectedErrorText.toLowerCase())
          ));
      expect(hasErrorText).toBe(true);
    }
  }

  /**
   * Asserts the sequence of Slack API calls
   */
  static expectCallSequence(calls: { mock: Mock; method: string; args?: Record<string, unknown> }[]) {
    calls.forEach((call, index) => {
      expect(call.mock).toHaveBeenCalledTimes(index + 1);
      if (call.args) {
        expect(call.mock).toHaveBeenNthCalledWith(index + 1, expect.objectContaining(call.args));
      }
    });
  }
}
