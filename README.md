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
- Add a **Slash Command**: `/poll`
  - Set the request URL to your ngrok URL + endpoint (e.g., `https://abc123.ngrok.io/slack/events`)
- Enable **Interactivity** and set the same URL
- Assign OAuth scopes: `commands`, `chat:write`, `incoming-webhook`
- Install the app into your workspace

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


