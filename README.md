# 🗳️ OpenPoll – TypeScript Open Source Slack Poll App

**OpenPoll** is an open-source Slack-integrated app that lets your team quickly create and run polls using a `/poll` command. Inspired by [Simple Poll](https://www.simplepoll.rocks/), OpenPoll is built in **TypeScript**, runs in **Docker**, and is fully customizable for self-hosting or development learning.

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
- **Node.js** (Express.js) – Lightweight backend API
- **Slack Bolt SDK** – Slack integration & command handling
- **MongoDB** – Poll & vote persistence
- **Docker** – Consistent dev & deployment environments
- **ngrok / localtunnel** – For local Slack command testing

---

## 🐳 Running OpenPoll with Docker

> 🧠 First, ensure you have [Docker installed](https://docs.docker.com/get-docker/).

### 1. Clone the repository

```bash
git clone https://github.com/your-org/openpoll.git
cd openpoll
```

### 2. Create a `.env` file with your configuration

```env
SLACK_SIGNING_SECRET=your_signing_secret
SLACK_BOT_TOKEN=xoxb-your-bot-token
MONGODB_URI=mongodb://mongo:27017/openpoll
```

### 3. Build and start the app using Docker Compose

```bash
docker-compose up --build
```

### 4. Expose your local app using `ngrok` (or similar) for Slack to reach it

```bash
npx ngrok http 3000
```

Copy the HTTPS URL provided by ngrok (e.g., `https://abc123.ngrok.io`).

### 5. Configure your Slack App

- Go to [https://api.slack.com/apps](https://api.slack.com/apps)
- Create a new app or select an existing one
- Add a **Slash Command**: `/poll`
  - Set the request URL to your ngrok URL + endpoint (e.g., `https://abc123.ngrok.io/slack/events`)
- Enable **Interactivity** and set the same URL
- Assign OAuth scopes: `commands`, `chat:write`, `incoming-webhook`
- Install the app into your workspace

---

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


