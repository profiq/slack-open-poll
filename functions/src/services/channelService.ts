import type { Channel } from '../types/channel';
import { FirestoreService } from './firestoreService';

export class ChannelService extends FirestoreService<Channel> {
  constructor() {
    super('channels_list');
  }

  async addChannel(channel: Omit<Channel, 'createdAt'>) {
    console.log('Adding channel:', channel);

    if (!channel.id) {
      console.error('Channel ID is missing! Cannot save channel.');
      return null;
    }

    const existing = await this.getById(channel.id);
    console.log('Existing channel:', existing);

    if (!existing) {
      const timestamp = new Date().toISOString();
      const dataWithTimestamp = { ...channel, createdAt: timestamp } as Channel;
      const docRef = this.getDocRef(channel.id);

      try {
        await docRef.set(dataWithTimestamp);
        console.log('Channel saved:', dataWithTimestamp);
        return dataWithTimestamp;
      } catch (e) {
        console.error('Failed to save channel:', e);
        return null;
      }
    }

    return existing;
  }
}
