import { vi } from 'vitest';
import { PollService } from '../../services/pollService';
import type { Poll } from '../../types/poll';

export function spyPollGetById(poll?: Partial<Poll> | null) {
  return vi.spyOn(PollService.prototype, 'getById').mockResolvedValue(poll as unknown as Poll | undefined | null);
}

export function spyPollVote(error?: Error) {
  if (error) {
    return vi.spyOn(PollService.prototype, 'vote').mockRejectedValue(error);
  }
  return vi.spyOn(PollService.prototype, 'vote').mockResolvedValue(undefined);
}

interface MockDoc {
  get: () => Promise<{ data: () => unknown }>;
}
export function spyPollCreate(mockDoc?: MockDoc) {
  const defaultDoc: MockDoc = { get: async () => ({ data: () => ({ id: 'mock', question: 'Q', options: [] }) }) };
  return vi.spyOn(PollService.prototype, 'create').mockResolvedValue(mockDoc ?? defaultDoc);
}

export function spyPollRunTransaction(impl?: (cb: unknown) => Promise<unknown>) {
  return vi
    .spyOn(PollService.prototype, 'runTransaction')
    .mockImplementation(async (cb: unknown) => (impl ? impl(cb) : (cb as (t: unknown) => unknown)({})) as unknown);
}

export function spyPollGetInTransaction(poll?: Partial<Poll> | undefined) {
  return vi.spyOn(PollService.prototype, 'getInTransaction').mockResolvedValue(poll as unknown as Poll | undefined);
}

export function spyPollUpdateInTransaction() {
  return vi.spyOn(PollService.prototype, 'updateInTransaction').mockResolvedValue(undefined as unknown as void);
}
