import querystring from 'querystring';

interface SlackCommandPayloadOptions {
  command: string;
  text: string;
  user_id: string;
  channel_id: string;
  team_id?: string;
  response_url?: string;
  trigger_id?: string;
}

export function slackCommandPayload(options: SlackCommandPayloadOptions): string {
  const payload = {
    command: options.command,
    text: options.text,
    user_id: options.user_id,
    user_name: 'testuser',
    channel_id: options.channel_id,
    channel_name: 'testchannel',
    team_id: options.team_id || 'T123ABC',
    team_domain: 'testteam',
    response_url: options.response_url || 'https://hooks.slack.com/commands/T123ABC/123456/abcdef123456',
    trigger_id: options.trigger_id || '123456789.123456.abcdef123456',
    api_app_id: 'A123ABC',
    token: 'valid_token',
  };

  return querystring.stringify(payload);
}

// Add more fixtures for interactive components, view submissions, etc.
