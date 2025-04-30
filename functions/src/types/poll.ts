export interface Poll {
  question: string;
  options: PollOption[];
  createdBy: string;
  channelTimeStamp: string;
  channelId: string;
  votes?: Vote[];
}

export type PollInput = Omit<Poll, 'id' | 'createdAt' | 'votes'>;

export interface PollOption {
  id: string;
  label: string;
  count?: number;
}

export interface Vote {
  userId: string;
  optionId: string;
}
