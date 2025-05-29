import { App, BlockAction, SlackActionMiddlewareArgs } from '@slack/bolt';
import { Logger } from '../utils/logger';

export const handleFormCreation = async (args: SlackActionMiddlewareArgs<BlockAction> & { client: App['client'] }) => {
  const { ack, body, client, action } = args;

  const log = new Logger().withContext({
    functionName: 'handleFormCreation',
  });

  const handleFormCreationTimer = log.startTimer('handleFormCreation');
  await ack();

  if (action.type !== 'button') {
    log.error(`Unexpected action type: ${action.type}`);
    throw new Error(`Unexpected action type: ${action.type}`);
  }

  const pollId = action.value;
  const triggerId = body.trigger_id;

  if (!triggerId) {
    log.error('Missing trigger id');
    throw new Error('Missing trigger id');
  }

  const blocks = [
    {
      type: 'input',
      block_id: 'option_block',
      label: {
        type: 'plain_text',
        text: 'Option',
      },
      element: {
        type: 'plain_text_input',
        action_id: 'option_input',
        placeholder: {
          type: 'plain_text',
          text: 'Enter your option here',
        },
      },
    },
  ];

  try {
    await client.views.open({
      trigger_id: triggerId,
      view: {
        type: 'modal',
        callback_id: 'custom_option_submit',
        private_metadata: pollId,
        title: {
          type: 'plain_text',
          text: 'Add Another Option',
        },
        blocks,
        submit: {
          type: 'plain_text',
          text: 'Submit',
        },
      },
    });

    log.debug('modal opened successfully');
  } catch (error) {
    log.error(String(error));
  }

  log.endTimer('handleFormCreation', handleFormCreationTimer);
};
