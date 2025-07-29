import { describe, it, expect } from 'vitest';
import {
  findFirstQuote,
  findMatchingClosingQuote,
  extractQuotedText,
  parseFlags,
  parseOptions,
  validateParsedCommand,
} from '../utils/commandParser';

describe('commandParser', () => {
  describe('findFirstQuote', () => {
    it('should find regular double quotes', () => {
      const result = findFirstQuote('Hello "world" test');
      expect(result).toEqual({ index: 6, char: '"' });
    });

    it('should find smart quotes', () => {
      const result = findFirstQuote('Hello "world" test');
      expect(result).toEqual({ index: 6, char: '"' });
    });

    it('should find single quotes', () => {
      const result = findFirstQuote("Hello 'world' test");
      expect(result).toEqual({ index: 6, char: "'" });
    });

    it('should find smart single quotes', () => {
      const result = findFirstQuote('Hello \u2018world\u2019 test');
      expect(result).toEqual({ index: 6, char: '\u2018' });
    });

    it('should return the first quote when multiple types exist', () => {
      const result = findFirstQuote('Hello "world" and \u2018test\u2019');
      expect(result).toEqual({ index: 6, char: '"' });
    });

    it('should return null when no quotes found', () => {
      const result = findFirstQuote('Hello world test');
      expect(result).toBeNull();
    });
  });

  describe('findMatchingClosingQuote', () => {
    it('should find matching regular double quote', () => {
      const text = '"Hello world"';
      const result = findMatchingClosingQuote(text, 0, '"');
      expect(result).toEqual({ index: 12, char: '"' });
    });

    it('should find matching smart closing quote for smart opening quote', () => {
      const text = '"Hello world"';
      const result = findMatchingClosingQuote(text, 0, '"');
      expect(result).toEqual({ index: 12, char: '"' });
    });

    it('should find regular quote as closing for smart opening quote', () => {
      const text = '"Hello world"';
      const result = findMatchingClosingQuote(text, 0, '"');
      expect(result).toEqual({ index: 12, char: '"' });
    });

    it('should return null when no matching closing quote found', () => {
      const text = '"Hello world';
      const result = findMatchingClosingQuote(text, 0, '"');
      expect(result).toBeNull();
    });
  });

  describe('extractQuotedText', () => {
    it('should extract text with regular quotes', () => {
      const result = extractQuotedText('multiple "What is your favorite color?" Red, Blue');
      expect(result).toEqual({
        question: 'What is your favorite color?',
        beforeQuote: 'multiple',
        afterQuote: 'Red, Blue',
        quotedSection: '"What is your favorite color?"',
      });
    });

    it('should extract text with smart quotes', () => {
      const result = extractQuotedText('multiple "What is your favorite color?" Red, Blue');
      expect(result).toEqual({
        question: 'What is your favorite color?',
        beforeQuote: 'multiple',
        afterQuote: 'Red, Blue',
        quotedSection: '"What is your favorite color?"',
      });
    });

    it('should extract text with mixed quote types', () => {
      const result = extractQuotedText('multiple "What is your favorite color?" Red, Blue');
      expect(result).toEqual({
        question: 'What is your favorite color?',
        beforeQuote: 'multiple',
        afterQuote: 'Red, Blue',
        quotedSection: '"What is your favorite color?"',
      });
    });

    it('should handle single quotes', () => {
      const result = extractQuotedText("multiple 'What is your favorite color?' Red, Blue");
      expect(result).toEqual({
        question: 'What is your favorite color?',
        beforeQuote: 'multiple',
        afterQuote: 'Red, Blue',
        quotedSection: "'What is your favorite color?'",
      });
    });

    it('should handle smart single quotes', () => {
      const result = extractQuotedText('multiple \u2018What is your favorite color?\u2019 Red, Blue');
      expect(result).toEqual({
        question: 'What is your favorite color?',
        beforeQuote: 'multiple',
        afterQuote: 'Red, Blue',
        quotedSection: '\u2018What is your favorite color?\u2019',
      });
    });

    it('should return null when no quotes found', () => {
      const result = extractQuotedText('multiple What is your favorite color Red, Blue');
      expect(result).toBeNull();
    });

    it('should return null when no closing quote found', () => {
      const result = extractQuotedText('multiple "What is your favorite color Red, Blue');
      expect(result).toBeNull();
    });

    it('should handle empty text before quote', () => {
      const result = extractQuotedText('"What is your favorite color?" Red, Blue');
      expect(result).toEqual({
        question: 'What is your favorite color?',
        beforeQuote: '',
        afterQuote: 'Red, Blue',
        quotedSection: '"What is your favorite color?"',
      });
    });

    it('should handle empty text after quote', () => {
      const result = extractQuotedText('multiple "What is your favorite color?"');
      expect(result).toEqual({
        question: 'What is your favorite color?',
        beforeQuote: 'multiple',
        afterQuote: '',
        quotedSection: '"What is your favorite color?"',
      });
    });
  });

  describe('parseFlags', () => {
    it('should parse multiple flag', () => {
      const result = parseFlags('multiple');
      expect(result.isMultiple).toBe(true);
      expect(result.maxVotes).toBe(10);
    });

    it('should set maxVotes to 1 when not multiple', () => {
      const result = parseFlags('custom');
      expect(result.isMultiple).toBe(false);
      expect(result.maxVotes).toBe(1);
    });

    it('should set maxVotes to 10 when multiple is set', () => {
      const result = parseFlags('multiple custom');
      expect(result.isMultiple).toBe(true);
      expect(result.maxVotes).toBe(10);
    });

    it('should parse custom flag', () => {
      const result = parseFlags('custom');
      expect(result.isCustom).toBe(true);
    });

    it('should parse custom flag with -c shorthand', () => {
      const result = parseFlags('-c');
      expect(result.isCustom).toBe(true);
    });

    it('should parse anonymous flag', () => {
      const result = parseFlags('anonymous');
      expect(result.isAnonymous).toBe(true);
    });

    it('should parse anonymous flag with -a shorthand', () => {
      const result = parseFlags('-a');
      expect(result.isAnonymous).toBe(true);
    });

    it('should parse limit with valid number', () => {
      const result = parseFlags('limit 5');
      expect(result.isMultiple).toBe(true);
      expect(result.maxVotes).toBe(5);
    });

    it('should parse limit with minimum valid number (2)', () => {
      const result = parseFlags('limit 2');
      expect(result.isMultiple).toBe(true);
      expect(result.maxVotes).toBe(2);
    });

    it('should parse limit with maximum valid number (10)', () => {
      const result = parseFlags('limit 10');
      expect(result.isMultiple).toBe(true);
      expect(result.maxVotes).toBe(10);
    });

    it('should ignore non-numeric limit and use default maxVotes', () => {
      const result = parseFlags('limit abc');
      expect(result.isMultiple).toBe(false);
      expect(result.maxVotes).toBe(1);
    });

    it('should parse integer part of decimal limit', () => {
      const result = parseFlags('limit 2.5');
      expect(result.isMultiple).toBe(true);
      expect(result.maxVotes).toBe(2);
    });

    it('should throw error for decimal limit with invalid integer part', () => {
      expect(() => parseFlags('limit 15.5')).toThrow('Invalid limit. Please provide a number between 2 and 10.');
    });

    it('should throw error for limit with number too high', () => {
      expect(() => parseFlags('limit 15')).toThrow('Invalid limit. Please provide a number between 2 and 10.');
    });

    it('should throw error for limit with number too low', () => {
      expect(() => parseFlags('limit 1')).toThrow('Invalid limit. Please provide a number between 2 and 10.');
    });

    it('should throw error for limit with zero', () => {
      expect(() => parseFlags('limit 0')).toThrow('Invalid limit. Please provide a number between 2 and 10.');
    });

    it('should ignore negative limit and use default maxVotes', () => {
      const result = parseFlags('limit -5');
      expect(result.isMultiple).toBe(false);
      expect(result.maxVotes).toBe(1);
    });

    it('should ignore non-numeric limit but respect multiple flag', () => {
      const result = parseFlags('multiple limit abc');
      expect(result.isMultiple).toBe(true);
      expect(result.maxVotes).toBe(10);
    });

    it('should parse multiple flags together', () => {
      const result = parseFlags('multiple custom anonymous limit 3');
      expect(result.isMultiple).toBe(true);
      expect(result.isCustom).toBe(true);
      expect(result.isAnonymous).toBe(true);
      expect(result.maxVotes).toBe(3);
    });

    it('should be case insensitive', () => {
      const result = parseFlags('MULTIPLE CUSTOM ANONYMOUS');
      expect(result.isMultiple).toBe(true);
      expect(result.isCustom).toBe(true);
      expect(result.isAnonymous).toBe(true);
    });
  });

  describe('parseOptions', () => {
    it('should parse simple options', () => {
      const result = parseOptions('Red, Blue, Green');
      expect(result.options).toEqual(['Red', 'Blue', 'Green']);
      expect(result.flags).toEqual([]);
    });

    it('should handle options with extra whitespace', () => {
      const result = parseOptions('  Red  ,  Blue  ,  Green  ');
      expect(result.options).toEqual(['Red', 'Blue', 'Green']);
    });

    it('should filter out empty options', () => {
      const result = parseOptions('Red, , Blue, , Green');
      expect(result.options).toEqual(['Red', 'Blue', 'Green']);
    });

    it('should parse options with flags', () => {
      const result = parseOptions('Red, Blue, Green --flag1 --flag2');
      expect(result.options).toEqual(['Red', 'Blue', 'Green']);
      expect(result.flags).toEqual(['flag1', 'flag2']);
    });

    it('should handle single option', () => {
      const result = parseOptions('Red');
      expect(result.options).toEqual(['Red']);
      expect(result.flags).toEqual([]);
    });

    it('should handle empty options text', () => {
      const result = parseOptions('');
      expect(result.options).toEqual([]);
      expect(result.flags).toEqual([]);
    });
  });

  describe('validateParsedCommand', () => {
    it('should validate valid command', () => {
      const result = validateParsedCommand({
        question: 'What is your favorite color?',
        options: ['Red', 'Blue', 'Green'],
      });
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject empty question', () => {
      const result = validateParsedCommand({
        question: '',
        options: ['Red', 'Blue'],
      });
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Question cannot be empty. Please provide a question in quotes.');
    });

    it('should reject whitespace-only question', () => {
      const result = validateParsedCommand({
        question: '   ',
        options: ['Red', 'Blue'],
      });
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Question cannot be empty. Please provide a question in quotes.');
    });

    it('should reject less than 2 options', () => {
      const result = validateParsedCommand({
        question: 'What is your favorite color?',
        options: ['Red'],
      });
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('At least 2 options are required. You provided 1 option(s).');
    });

    it('should reject more than 10 options', () => {
      const result = validateParsedCommand({
        question: 'What is your favorite color?',
        options: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'],
      });
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Maximum 10 options allowed. You provided 11 options.');
    });

    it('should accept exactly 10 options', () => {
      const result = validateParsedCommand({
        question: 'What is your favorite color?',
        options: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],
      });
      expect(result.isValid).toBe(true);
    });

    it('should accept exactly 2 options', () => {
      const result = validateParsedCommand({
        question: 'What is your favorite color?',
        options: ['Red', 'Blue'],
      });
      expect(result.isValid).toBe(true);
    });
  });
});
