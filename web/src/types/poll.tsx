import type {BaseDocument} from './baseDocument.tsx';

export interface Poll extends BaseDocument {
    id: string;
    question: string;
    options: PollOption[];
    createdBy: string;
    channelTimeStamp: string;
    channelId: string;
    votes?: Vote[];
    multiple?: boolean;
    maxVotes?: number;
    custom?: boolean;
    closed?: boolean;
    anonymous?: boolean;
}

export type PollInput = Omit<Poll, 'createdAt'>;

export interface PollOption {
    id: string;
    label: string;
    count?: number;
    deleted?: boolean;
}

export interface Vote {
    userId: string;
    optionId: string;
}

export interface User extends BaseDocument {
  id: string;
  name: string;
}

export interface Channel extends BaseDocument {
  id: string;
  name: string;
}