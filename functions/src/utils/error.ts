import { App } from '@slack/bolt';
import { z } from 'zod';

const SlackErrorSchema = z.object({
  error: z.object({
    code: z.string().optional(),
    data: z
      .object({
        error: z.string().optional(),
      })
      .optional(),
  }),
  context: z.object({
    userId: z.string().optional(),
  }),
});

export const errorNotInChannel = (app: App) => {
  app.error(async (error) => {
    const parseResult = SlackErrorSchema.safeParse(error);
    if (!parseResult.success) return;

    const { error: errData, context } = parseResult.data;

    if (errData.data?.error === 'not_in_channel' && errData.code === 'slack_webapi_platform_error' && context.userId) {
      try {
        const imResult = await app.client.conversations.open({
          users: context.userId,
        });

        const dmChannel = imResult.channel?.id;
        if (!dmChannel) return;

        await app.client.chat.postMessage({
          channel: dmChannel,
          text:
            "I can't send a message to the channel because I'm not added there. " +
            'Please add me manually or invite me using `/invite @<bot_name>`.',
        });
      } catch (err) {
        console.error('Error sending DM:', err);
      }
    }
  });
};
