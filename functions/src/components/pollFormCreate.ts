import { SlackCommandMiddlewareArgs } from '@slack/bolt';
import { ViewsOpenArguments } from '@slack/web-api';

interface SlackTriggerBody {
  trigger_id: string;
}

export const pollFormCreate = (
  body: SlackTriggerBody,
  command: SlackCommandMiddlewareArgs['command']
): ViewsOpenArguments => {
  return {
    trigger_id: body.trigger_id,
    view: {
      type: 'modal',
      callback_id: 'create_form_poll',
      private_metadata: command.channel_id,
      title: {
        type: 'plain_text',
        text: 'Create Poll',
        emoji: true,
      },
      submit: {
        type: 'plain_text',
        text: 'Submit',
        emoji: true,
      },
      close: {
        type: 'plain_text',
        text: 'Cancel',
        emoji: true,
      },
      blocks: [
        {
          type: 'input',
          block_id: 'question',
          element: {
            type: 'plain_text_input',
            action_id: 'plain_text_input_question',
            placeholder: {
              type: 'plain_text',
              text: 'Write Question',
            },
          },
          label: {
            type: 'plain_text',
            text: 'Question',
            emoji: true,
          },
        },
        {
          type: 'input',
          block_id: 'option_value',
          element: {
            type: 'number_input',
            is_decimal_allowed: false,
            action_id: 'number_input_limit_section',
            min_value: '1',
            max_value: '2',
            placeholder: {
              type: 'plain_text',
              text: 'Enter a number',
            },
          },
          label: {
            type: 'plain_text',
            text: 'Limit number of sections',
            emoji: true,
          },
        },
        {
          type: 'input',
          block_id: 'select_custom',
          element: {
            type: 'static_select',
            placeholder: {
              type: 'plain_text',
              text: 'Select Yes/No',
              emoji: true,
            },
            options: [
              {
                text: {
                  type: 'plain_text',
                  text: 'Yes',
                  emoji: true,
                },
                value: 'yes',
              },
              {
                text: {
                  type: 'plain_text',
                  text: 'No',
                  emoji: true,
                },
                value: 'no',
              },
            ],
            action_id: 'static_select_custom_option',
          },
          label: {
            type: 'plain_text',
            text: 'Add abillity to add custom options?',
            emoji: true,
          },
        },
        {
          type: 'input',
          block_id: 'option_input_1',
          element: {
            type: 'plain_text_input',
            action_id: 'plain_text_input_option_1',
            placeholder: {
              type: 'plain_text',
              text: 'Write option',
            },
          },
          label: {
            type: 'plain_text',
            text: 'Option 1',
            emoji: true,
          },
        },
        {
          type: 'input',
          block_id: 'option_input_2',
          element: {
            type: 'plain_text_input',
            action_id: 'plain_text_input_option_2',
            placeholder: {
              type: 'plain_text',
              text: 'Write option',
            },
          },
          label: {
            type: 'plain_text',
            text: 'Option 2',
            emoji: true,
          },
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'Add option',
                emoji: true,
              },
              value: 'add_option',
              action_id: 'create_form_add_option',
            },
          ],
        },
      ],
    },
  };
};
