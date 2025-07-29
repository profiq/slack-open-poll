/**
 * Utility functions for parsing poll commands with robust quote handling
 */

/**
 * Different types of quote characters that Slack might use
 */
export const QUOTE_CHARS = {
  REGULAR: '"',
  SMART_LEFT: '\u201C',
  SMART_RIGHT: '\u201D',
  SINGLE: "'",
  SINGLE_SMART_LEFT: '\u2018',
  SINGLE_SMART_RIGHT: '\u2019',
} as const;

/**
 * All possible opening quote characters
 */
export const OPENING_QUOTES = [
  QUOTE_CHARS.REGULAR,
  QUOTE_CHARS.SMART_LEFT,
  QUOTE_CHARS.SINGLE,
  QUOTE_CHARS.SINGLE_SMART_LEFT,
] as const;

/**
 * All possible closing quote characters
 */
export const CLOSING_QUOTES = [
  QUOTE_CHARS.REGULAR,
  QUOTE_CHARS.SMART_RIGHT,
  QUOTE_CHARS.SINGLE,
  QUOTE_CHARS.SINGLE_SMART_RIGHT,
] as const;

/**
 * Map opening quotes to their corresponding closing quotes
 */
export const QUOTE_PAIRS: Record<string, string[]> = {
  [QUOTE_CHARS.REGULAR]: [QUOTE_CHARS.REGULAR, QUOTE_CHARS.SMART_RIGHT],
  [QUOTE_CHARS.SMART_LEFT]: [QUOTE_CHARS.SMART_RIGHT, QUOTE_CHARS.REGULAR],
  [QUOTE_CHARS.SINGLE]: [QUOTE_CHARS.SINGLE, QUOTE_CHARS.SINGLE_SMART_RIGHT],
  [QUOTE_CHARS.SINGLE_SMART_LEFT]: [QUOTE_CHARS.SINGLE_SMART_RIGHT, QUOTE_CHARS.SINGLE],
};

/**
 * Find the first occurrence of any opening quote character
 */
export function findFirstQuote(text: string): { index: number; char: string } | null {
  let minIndex = Infinity;
  let foundChar = '';

  for (const quote of OPENING_QUOTES) {
    const index = text.indexOf(quote);
    if (index !== -1 && index < minIndex) {
      minIndex = index;
      foundChar = quote;
    }
  }

  return minIndex === Infinity ? null : { index: minIndex, char: foundChar };
}

/**
 * Find the matching closing quote for an opening quote
 */
export function findMatchingClosingQuote(
  text: string,
  startIndex: number,
  openingQuote: string
): { index: number; char: string } | null {
  const possibleClosingQuotes = QUOTE_PAIRS[openingQuote] || [openingQuote];
  let minIndex = Infinity;
  let foundChar = '';

  for (const closingQuote of possibleClosingQuotes) {
    const index = text.indexOf(closingQuote, startIndex + 1);
    if (index !== -1 && index < minIndex) {
      minIndex = index;
      foundChar = closingQuote;
    }
  }

  return minIndex === Infinity ? null : { index: minIndex, char: foundChar };
}

/**
 * Extract quoted text from a string, handling various quote types
 */
export function extractQuotedText(text: string): {
  question: string;
  beforeQuote: string;
  afterQuote: string;
  quotedSection: string;
} | null {
  const firstQuote = findFirstQuote(text);
  if (!firstQuote) {
    return null;
  }

  const closingQuote = findMatchingClosingQuote(text, firstQuote.index, firstQuote.char);
  if (!closingQuote) {
    return null;
  }

  const beforeQuote = text.slice(0, firstQuote.index).trim();
  const question = text.slice(firstQuote.index + 1, closingQuote.index);
  const afterQuote = text.slice(closingQuote.index + 1).trim();
  const quotedSection = text.slice(firstQuote.index, closingQuote.index + 1);

  return {
    question,
    beforeQuote,
    afterQuote,
    quotedSection,
  };
}

/**
 * Parse command flags from the keyword part of the command
 */
export function parseFlags(keywordPart: string): {
  isMultiple: boolean;
  isCustom: boolean;
  isAnonymous: boolean;
  maxVotes: number;
} {
  const lowerKeywords = keywordPart.toLowerCase();

  let isMultiple = lowerKeywords.includes('multiple');
  const isCustom = lowerKeywords.includes('custom') || lowerKeywords.includes('-c');
  const isAnonymous = lowerKeywords.includes('anonymous') || lowerKeywords.includes('-a');

  // Parse max votes limit
  const maxVotesMatch = keywordPart.match(/limit\s+(\d{1,2})/i);
  let maxVotes = 1;

  if (maxVotesMatch) {
    const parsedInt = parseInt(maxVotesMatch[1], 10);
    if (parsedInt >= 2 && parsedInt <= 10) {
      maxVotes = parsedInt;
    }
    isMultiple = true;
  } else {
    maxVotes = 10;
  }

  return {
    isMultiple,
    isCustom,
    isAnonymous,
    maxVotes,
  };
}

/**
 * Parse options from the options part of the command
 */
export function parseOptions(optionsText: string): {
  options: string[];
  flags: string[];
} {
  const [optionsPart, ...flagsFull] = optionsText.split('--');
  const options = optionsPart
    .split(',')
    .map((o) => o.trim())
    .filter((o) => o.length > 0);

  const flags = flagsFull.map((f) => f.trim());

  return { options, flags };
}

/**
 * Validate parsed command data
 */
export function validateParsedCommand(data: { question: string; options: string[] }): {
  isValid: boolean;
  error?: string;
} {
  if (!data.question || data.question.trim().length === 0) {
    return { isValid: false, error: 'Question cannot be empty. Please provide a question in quotes.' };
  }

  if (data.options.length < 2) {
    return { isValid: false, error: `At least 2 options are required. You provided ${data.options.length} option(s).` };
  }

  if (data.options.length > 10) {
    return { isValid: false, error: `Maximum 10 options allowed. You provided ${data.options.length} options.` };
  }

  return { isValid: true };
}

/**
 * Get detailed error message for parsing failures
 */
export function getParsingErrorMessage(text: string): string {
  const firstQuote = findFirstQuote(text);

  if (!firstQuote) {
    return 'No question found. Please enclose your question in quotes (e.g., "Your question?").';
  }

  const closingQuote = findMatchingClosingQuote(text, firstQuote.index, firstQuote.char);
  if (!closingQuote) {
    return `Missing closing quote for your question. Found opening quote "${firstQuote.char}" but no matching closing quote.`;
  }

  const question = text.slice(firstQuote.index + 1, closingQuote.index);
  if (!question.trim()) {
    return 'Question cannot be empty. Please provide a question between the quotes.';
  }

  const afterQuote = text.slice(closingQuote.index + 1).trim();
  if (!afterQuote) {
    return 'No options found. Please provide at least 2 options after your question.';
  }

  const options = afterQuote
    .split(',')
    .map((o) => o.trim())
    .filter((o) => o.length > 0);
  if (options.length < 2) {
    return `At least 2 options are required. You provided ${options.length} option(s).`;
  }

  if (options.length > 10) {
    return `Maximum 10 options allowed. You provided ${options.length} options.`;
  }

  return 'Unknown parsing error. Please check your command format.';
}
