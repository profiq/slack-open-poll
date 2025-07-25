import { App, BlockAction, SlackActionMiddlewareArgs } from '@slack/bolt';
import { InputBlock } from '@slack/types';
import { Logger } from '../utils/logger';

export const handleAddOptionCreateForm = async (
  args: SlackActionMiddlewareArgs<BlockAction> & { client: App['client'] }
) => {
  const { ack, body, client } = args;

  const log = new Logger().withContext({
    functionName: 'handleOpenButton',
  });

  await ack();

  const view = body.view;

  const blocks = view?.blocks;

  const optionInForm = blocks?.filter((b) => b.block_id?.startsWith('option_input_'));

  if (!optionInForm) {
    log.error(`No options input blocks found in form`);
    return;
  }

  if (Array.isArray(optionInForm)) {
    if (optionInForm.length >= 10) {
      log.error('Max is less than 10');
      return;
    }

    const nextIndex = optionInForm.length + 1;

    const newInputBlock = {
      type: 'input',
      block_id: `option_input_${nextIndex}`,
      element: {
        type: 'plain_text_input',
        action_id: `plain_text_input_option_${nextIndex}`,
        placeholder: {
          type: 'plain_text',
          text: 'Write option',
        },
      },
      label: {
        type: 'plain_text',
        text: `Option ${nextIndex}`,
        emoji: true,
      },
    };

    const allBlocks = blocks ?? [];

    const indexToUpdate = allBlocks.findIndex((block) => block.block_id === 'option_value');

    if (indexToUpdate === -1) {
          log.error('option_value block not found in modal');
          return;
    }

    const inputBlock = allBlocks[indexToUpdate] as InputBlock;



    if (inputBlock.element.type === 'number_input') {
      const updatedBlock: InputBlock = {
        ...inputBlock,
        element: {
          ...inputBlock.element,
          max_value: String(nextIndex),
        },
      };

      const newBlocks = [
        ...allBlocks.slice(0, indexToUpdate),
        updatedBlock,
        ...allBlocks.slice(indexToUpdate + 1, -1),
        newInputBlock,
        allBlocks[allBlocks.length - 1],
      ];

      if (!view) {
        throw new Error('Missing view data');
      }

      await client.views.update({
        view_id: String(view.id),
        hash: view.hash,
        view: {
          type: 'modal',
          callback_id: String(view.callback_id),
          private_metadata: view.private_metadata,
          title: view.title,
          submit: view.submit ?? { type: 'plain_text', text: 'Submit' },
          blocks: newBlocks,
        },
      });
    } else {
      throw new Error('Expected element type number_input');
    }
  }
};
