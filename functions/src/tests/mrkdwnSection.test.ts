import { describe, it, expect } from 'vitest';
import { SectionBlock } from '@slack/types';
import { mrkdwnSection } from '../components/mrkdwnSection';

describe('mrkdwnSection', () => {
  it('should render an error message block with custom message', () => {
    const message = 'This is error';
    const result = mrkdwnSection('error', message) as SectionBlock;

    expect(result.type).toBe('section');
    expect(result.text?.type).toBe('mrkdwn');
    expect(result.text?.text).toBe(message);
  });

  it('should render default error message when no message is provided', () => {
    const result = mrkdwnSection('error') as SectionBlock;

    expect(result.text?.text).toBe('Something went wrong. Please try again.');
  });

  it('should render a confirmation message block with custom message', () => {
    const message = 'Poll submitted!';
    const result = mrkdwnSection('confirmation', message) as SectionBlock;

    expect(result.type).toBe('section');
    expect(result.text?.type).toBe('mrkdwn');
    expect(result.text?.text).toBe(message);
  });

  it('should render default confirmation message if not provided', () => {
    const result = mrkdwnSection('confirmation') as SectionBlock;

    expect(result.text?.text).toBe('Your vote was recorded!');
  });

  it('should render loading message block with custom message', () => {
    const message = 'Fetching data...';
    const result = mrkdwnSection('loading', message) as SectionBlock;

    expect(result.text?.text).toBe(message);
  });

  it('should render default loading message if not provided', () => {
    const result = mrkdwnSection('loading') as SectionBlock;

    expect(result.text?.text).toBe('Loading poll...');
  });
});
