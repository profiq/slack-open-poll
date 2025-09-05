import type { Channel } from '../types/channel';
import { FirestoreService } from './firestoreService';

export class ChannelService extends FirestoreService<Channel> {
  constructor() {
    super('channels_list');
  }

  async addChannel(channel: Omit<Channel, 'createdAt'>) {
    if (!channel.id) {
      throw new Error('Channel ID is missing! Cannot save channel.');
    }

    const timestamp = new Date().toISOString();
    const dataWithTimestamp = { ...channel, createdAt: timestamp } as Channel;

    return this.create(dataWithTimestamp);
  }
}
