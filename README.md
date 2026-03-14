# CTF Platform

A Jeopardy-style Capture The Flag competition platform built with React, Express, and Firebase.

## Architecture

```
ctf-platform/
├── client/          # React frontend (Vite)
├── server/          # Express API backend
├── shared/          # Shared constants and schemas
├── .env.example     # Environment variable template
└── package.json     # Workspace root
```

## Prerequisites

- **Node.js** >= 18
- **npm** >= 9
- A **Firebase project** with Firestore, Authentication (Email/Password), and Storage enabled

## Firebase Setup

1. Go to the [Firebase Console](https://console.firebase.google.com/) and create a new project.
2. Enable **Authentication** with the Email/Password provider.
3. Create a **Firestore Database** (start in test mode for development).
4. Enable **Firebase Storage**.
5. Generate a **Service Account Key** from Project Settings > Service Accounts > Generate New Private Key.
6. Copy the Web App config from Project Settings > General > Your Apps > Web App.

### Create Required Firestore Indexes

The leaderboard query requires a composite index:

- Collection: `teams`
- Fields: `score` (Descending), `lastSolveTime` (Ascending)

You can create this from the Firebase Console or it will be prompted on first query.

## Environment Configuration

Copy the example env file and fill in your Firebase credentials:

```bash
cp .env.example .env
```

Fill in the values:

| Variable | Description |
|---|---|
| `VITE_FIREBASE_API_KEY` | Firebase Web API Key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Auth domain (project.firebaseapp.com) |
| `VITE_FIREBASE_PROJECT_ID` | Firebase Project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Storage bucket (project.appspot.com) |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Messaging Sender ID |
| `VITE_FIREBASE_APP_ID` | Firebase App ID |
| `FIREBASE_PROJECT_ID` | Same Project ID (for server) |
| `FIREBASE_CLIENT_EMAIL` | Service account email |
| `FIREBASE_PRIVATE_KEY` | Service account private key (keep quotes) |
| `PORT` | Server port (default: 4000) |

## Installation

From the project root:

```bash
npm install
```

This installs dependencies for all workspaces (client, server, shared).

## Running the Application

### Start both client and server:

```bash
npm run dev
```

### Start individually:

```bash
# Server only (http://localhost:4000)
npm run dev:server

# Client only (http://localhost:5173)
npm run dev:client
```

The client dev server proxies `/api` requests to the backend automatically.

## API Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/health` | No | Health check |
| POST | `/api/auth/register` | Yes | Register user profile |
| GET | `/api/auth/profile` | Yes | Get user profile |
| GET | `/api/challenges` | Yes | List active challenges |
| GET | `/api/challenges/:id` | Yes | Get challenge details |
| POST | `/api/submit-flag` | Yes | Submit a flag |
| GET | `/api/leaderboard` | Yes | Get team leaderboard |
| POST | `/api/admin/challenges` | Admin | Create a challenge |
| PUT | `/api/admin/challenges/:id` | Admin | Update a challenge |
| PATCH | `/api/admin/challenges/:id/toggle` | Admin | Enable/disable challenge |
| GET | `/api/admin/event` | Admin | Get event settings |
| PUT | `/api/admin/event` | Admin | Update event settings |

## Firestore Collections

### `users`
`uid`, `username`, `email`, `teamId`, `role`, `createdAt`

### `teams`
`teamId`, `teamName`, `captainId`, `members[]`, `score`, `lastSolveTime`

### `challenges`
`title`, `category`, `difficulty`, `points`, `description`, `flag`, `files[]`, `solveCount`, `isActive`, `createdAt`

### `submissions`
`userId`, `teamId`, `challengeId`, `flag`, `correct`, `timestamp`

### `events`
`startTime`, `endTime`, `isActive`

## Flag Submission Flow

1. Player submits a flag for a challenge
2. Server checks if the competition is active
3. Server checks for duplicate solves (per team)
4. Flag is compared against the stored challenge flag
5. Submission is recorded regardless of correctness
6. On correct solve: team score is incremented and solve count is updated

## Building for Production

```bash
npm run build:client
npm run build:server
```

## License

MIT
