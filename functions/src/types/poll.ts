import { BaseDocument } from './baseDocument';

export interface Poll extends BaseDocument {
  question: string;
  options: PollOption[];
  createdBy: string;
  channelTimeStamp: string;
  channelId: string;
  votes?: Vote[];
  multiple?: boolean;
  maxVotes?: number;
}

export type PollInput = Omit<Poll, 'createdAt'>;

export interface PollOption {
  id: string;
  label: string;
  count?: number;
}

export interface Vote {
  userId: string;
  optionId: string;
}
