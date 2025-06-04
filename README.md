# 🗳️ OpenPoll – TypeScript Open Source Slack Poll App

**OpenPoll** is an open-source Slack-integrated app that lets your team quickly create and run polls using a `/poll` command. Inspired by [Simple Poll](https://www.simplepoll.rocks/), OpenPoll is built in **TypeScript**, runs on **Firebase Cloud Functions**, and is fully customizable for self-hosting or development learning.

---

## 🚀 Project Goals

- Build a **Slack-integrated polling bot**
- Written in **TypeScript**
- Containerized with **Docker**
- Encourage learning and contributions via open-source collaboration
- Provide a lightweight, customizable alternative to commercial polling apps

---

## 🧩 Key Features (Planned)

| Feature                         | Status     |
| ------------------------------ | ---------- |
| `/poll` Slack command          | ✅ Planned |
| Anonymous & named voting       | ✅ Planned |
| Single & multi-choice polls    | ✅ Planned |
| Real-time vote updates         | ✅ Planned |
| Result summaries in thread     | ✅ Planned |
| Scheduled expiration of polls  | ⬜ Future  |
| Web dashboard (admin optional) | ⬜ Future  |

---

## 🔧 Tech Stack

- **TypeScript** – Strong typing for clean and scalable code
- **Firebase Cloud Functions** – Serverless backend API
- **Cloud Firestore** – Real-time poll & vote persistence
- **Slack Bolt SDK** – Slack integration & command handling
- **ngrok / localtunnel** – For local Slack command testing

---

## Architecture

### Flow chart
```mermaid
flowchart TD
 subgraph subGraph0["Firebase Function"]
        D["Slack Bolt App with ExpressReceiver"]
        C["Firebase Function"]
        E["Handle Slash Command or Interaction"]
        F["Read/Write to Firestore"]
        G["Recalculate Vote Totals"]
        H["Build Updated Slack Message"]
        I["Call chat.update to refresh Slack message"]
  end
    A["User on Slack"] -- Slash Command or Button Click --> B["Slack API"]
    B -- HTTP Request --> C
    C --> D
    D --> E
    E --> F
    F --> G
    G --> H
    H --> I
```

### Architecture Diagram

```mermaid
sequenceDiagram
  actor User as User
  participant Slack as Slack API
  participant FirebaseFunction as FirebaseFunction
  participant SlackBolt as SlackBolt
  participant Firestore as Firestore
  User ->> Slack: /createpoll or clicks button
  Slack ->> FirebaseFunction: Sends payload (slash command / interaction)
  FirebaseFunction ->> SlackBolt: Passes request to ExpressReceiver
  SlackBolt ->> SlackBolt: Parses command or interaction
  SlackBolt ->> Firestore: Store poll or update vote
  Firestore -->> SlackBolt: Poll data and vote results
  SlackBolt ->> Slack: chat.postMessage or chat.update with new blocks
  Slack -->> User: Updated poll message with current results
```
---


## 🚀 Running OpenPoll Locally

> 🧠 First, ensure you have [Node.js](https://nodejs.org/) and [Firebase CLI](https://firebase.google.com/docs/cli) installed.

### 1. Clone the repository

```bash
git clone https://github.com/your-org/openpoll.git
cd openpoll
```

### 2. Set up Firebase

```bash
npm install -g firebase-tools
firebase login
```

### 3. Create a `.env` file with your configuration

```env
SLACK_SIGNING_SECRET=your_signing_secret
SLACK_BOT_TOKEN=xoxb-your-bot-token
NODE_ENV=development
FIRESTORE_EMULATOR_HOST=localhost:8080
```

You can get `SLACK_SIGNING_SECRET` and `SLACK_BOT_TOKEN` in step number 6

### 4. Install dependencies and start the development server

```bash
cd functions
npm install
npm run serve:watch
```

### 5. Expose your local app using `ngrok` (or similar) for Slack to reach it

```bash
npx ngrok http 5001
```

Copy the HTTPS URL provided by ngrok (e.g., `https://abc123.ngrok.io`).

### 6. Configure your Slack App

- Go to [https://api.slack.com/apps](https://api.slack.com/apps)
- Create a new app or select an existing one
- In **Features** open **Event Subscriptions** and select **On**
- Into Request URL paste your ngrok URL and wait for verification
- Open **Slash Commands** and **Create New Command** and fill in the details:
  - Command: '/poll'
  - Request URL: your ngrok URL + endpoint (e.g., `https://abc123.ngrok.io/slack/events`)
  - Optional: fill Short Description and Usage Hint
  - **Save** in the bottom-right corner
- In **Interactivity** select **On** and set the same URL
- In **OAuth & Permissions** scroll down to **Scopes** and assign following scopes:
  - `channels:history`
  - `chat:write`
  - `commands`
  - `incoming-webhook`
- Now update your .env file:
  - Get `SLACK_SIGNING_SECRET` in **Settings** and **Basic Information**
  - Get `SLACK_BOT_TOKEN` in **Features** and **OAuth & Permisions** in OAuth Tokens
- Install the app into your workspace under the token you just got

---

## Firebase Firestone Database

This module provides a database setup for future usage for a Slack Bolt app

### Usage
```ts
import DatabaseService from './databaseService';
const db = DatabaseService.getInstance();
```

### Local testing with emulator
get to the root of the project - /open-poll
firebase emulators:start --only firestore

### For future testing and usage we will need to
add into .env firebase service key and development:
```ini
FIREBASE_SERVICE_ACCOUNT_KEY=<your-key>
NODE_ENV=development
```

## Usage of Logger

Basic setup:
```ts
import { Logger } from './utils/logger';
const logger = new Logger({ requestId: 'r-123' });
logger.info('Logger started');
```
User context:
```ts
loger.info('User did something', {
  userId: 'u-id',
  workspaceId: 'w-id',
});
```
Using withContext:
```ts
const userLogger = logger.withContext({
  userId: 'u-id',
  workspaceId: 'w-id',
});
userLogger.debug('Debugging user data');
userLogger.info('User joined a poll', { pollIdd: 'p-id' });
```
Using logger errors:
```ts
try {
  throw new Error('Error');
} catch (err) {
  logger.error(err);
}
```

## Slash Command Handler

Handler processes `/poll` commands from users, validates the input, creates a poll using chat.postMessage
Returns the poll message with options and buttons for voting
Added functionality for multi-choice polls

#### Funcionality

Parses poll question and options from command text
Adds a lot of functionality by using flags
Creates a poll using the PollService
Returns a block message in the Slack channel with the question, options and buttons
Handles errors if the command format is invalid or if the poll creation fails
When errors happen, the slash command is responded by chat.postEphemeral which is shown just to the user that tried to create the poll

### Flags

You can use flags before typing the question to customise the poll usage:
- `multiple`:
  - creates a poll that enables having multiple options
  - ```
    /poll multiple "Question"...
    ```
- `limit`:
  - upgraded multiple poll that enables maximum of votes given
  - ```
    /poll limit 2 "Question"...
    ```
  - creates a poll that enables maximum of 2 votes
  - when trying to add vote above limit responds with ephemeral message
- `custom`:
  - creates a poll that enables users to add custom option
  - creates a button at the bottom of the poll
  - when clicked it opens a form where you can type your new option and submit it
  - ```
    /poll custom "Question"...
    ```
Tip: you can combine flags
```
/poll custom limit 2 "Question"...
```


### Usage and Example

Template:
```
/poll "Question?" Option 1, Option 2, Option 3
```
Example:
```
/poll "When would be the right time for a meeting?" 10 AM, 2 PM, 4 PM, 6 PM 
```

## Vote Handler

Handler processes app.action when the vote happens

### Functionality

The vote is recorded in the PollService
After vote is recorded, the poll display is updated with the latest vote counts using user's ID
If user votes again for the same option, the vote is deleted

If user votes again for different option:
- For single choice polls (default):
  - Previous choice gets deleted
  - New choice is added
- For multi-choice polls:
  - Previous choices stay intact
  - New choice is added to list of other choices

## Open Button

`Open` button in every Slack poll opens a form with poll options  
There are two buttons:
- `Your Votes`:
  - Shows your own options, which you have voted for
- `Settings`:  
  Only the creator of the poll can access this form  
  Opens two buttons:
  - `Close Poll`:
    - Closes the poll (poll.closed)
    - Blocks another votes after the poll is closed
    - Posts result in the poll message thread
    - Updates original poll message with `Voting has ended for this poll`
    - For any other vote attempt responds with ephemeral message
  - `Delete Poll`:
    - Soft deletes the poll in Firestore Database - just has the flag `deleted`
    - Deletes the original poll message
    - Displays informative form for user about deleting the poll

## 📚 Learning Resources

If you're new to some parts of this stack, check out these:

### 🧠 Slack App Development

- [Slack Bolt for JS](https://slack.dev/bolt-js/)
- [Creating Slack Commands](https://api.slack.com/interactivity/slash-commands)
- [Slack App Manifest Templates](https://api.slack.com/reference/manifests)

### 🔥 TypeScript & Node

- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [Node.js + Express.js Crash Course](https://developer.mozilla.org/en-US/docs/Learn/Server-side/Express_Nodejs)

### 🐳 Docker & DevOps

- [Docker for Node.js Projects](https://nodejs.org/en/docs/guides/nodejs-docker-webapp/)
- [Docker Compose Basics](https://docs.docker.com/compose/)

---

## 🤝 Contributing

We welcome contributions to OpenPoll!

1. Fork the repo
2. Create a new feature branch
3. Make your changes
4. Submit a PR

Please follow the [Conventional Commits](https://www.conventionalcommits.org/) style for commit messages.

---

## 📌 Roadmap (Milestones)

- ⬜ Slack command parsing & payload verification
- ⬜ Docker dev environment
- ⬜ Poll creation & vote storage (MongoDB)
- ⬜ Vote interaction UI
- ⬜ Web admin dashboard
- ⬜ OAuth installation flow for multi-workspace support

---

## 📜 License

MIT – free to use, modify, and distribute.

---

Made with ❤️ by profiq.


