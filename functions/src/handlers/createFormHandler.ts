/*
import { SlackActionMiddlewareArgs, BlockAction, SlackCommandMiddlewareArgs } from '@slack/bolt';

type CreateFormArgs =
    | (SlackActionMiddlewareArgs<BlockAction> & { client: App['client'] })
    | (SlackCommandMiddlewareArgs & { client: App['client'] });

export const handleCreateForm = async (args: CreateFormArgs) => {
    const { client, body } = args;

    await client.views.open({
        trigger_id: body.trigger_id, // Platí i pro slash command
        view: {
            type: 'modal',
            callback_id: 'poll_form_submit',
            title: {
                type: 'plain_text',
                text: 'Create Poll',
            },
            submit: {
                type: 'plain_text',
                text: 'Create',
            },
            close: {
                type: 'plain_text',
                text: 'Cancel',
            },
            blocks: [
                {
                    type: 'input',
                    block_id: 'question_block',
                    element: {
                        type: 'plain_text_input',
                        action_id: 'question_input',
                    },
                    label: {
                        type: 'plain_text',
                        text: 'What is your question?',
                    },
                },
                {
                    type: 'input',
                    block_id: 'option_block',
                    element: {
                        type: 'plain_text_input',
                        multiline: true,
                        action_id: 'option_input',
                        placeholder: {
                            type: 'plain_text',
                            text: 'Enter one option per line',
                        },
                    },
                    label: {
                        type: 'plain_text',
                        text: 'Options',
                    },
                },
            ],
        },
    });
};
*/
