import { App } from '@slack/bolt';

export const errorNotInChannel = (app: App) => {
  app.error(async (error) => {
    const maybeError = error as unknown;

    if (typeof maybeError === 'object' && maybeError !== null && 'error' in maybeError && 'context' in maybeError) {
      const { error: errData, context } = maybeError as {
        error: { code?: string; data?: { error?: string } };
        context: { userId?: string };
      };

      if (
        errData.data?.error === 'not_in_channel' &&
        errData.code === 'slack_webapi_platform_error' &&
        context.userId
      ) {
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
              'Please add me manually or invite me using `/invite @yourbot`.',
          });
        } catch (err) {
          console.error('Error sending DM:', err);
        }
      }
    }
  });
};
