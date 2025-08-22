```markdown
# QuizApp-Backend

Backend for the QuizApp — a TypeScript-based API that manages quiz creation, player participation, answer collection, and optional on-chain submission of results.

This README was created from the repository's backend-readme.md and adapted into a practical guide to get the service running, explain the data model, list common API endpoints, and describe the smart-contract integration.

---

## Table of contents
- About
- Features
- Tech stack
- Getting started
  - Prerequisites
  - Install
  - Environment variables
  - Database setup
  - Run
- Data model
- API endpoints (summary)
- Smart contract interaction
- Security notes
- Development & testing
- Deployment
- Contributing & contact
- License

---

## About
QuizApp-Backend is the backend service for a decentralized quiz platform. It exposes REST endpoints for quiz lifecycle management, persists quizzes and answers in MongoDB, and can prepare or submit aggregated answers and scores to an Ethereum smart contract for transparent, trustless winner settlement.

---

## Features
- Create and manage quizzes and questions
- Player join flow and answer submission
- Persist user answers and quiz data in MongoDB
- Aggregate answers and submit them (or prepare transactions) to an on-chain smart contract
- Winner calculation and persistence
- REST API for frontend integration

---

## Tech stack
- TypeScript (Node.js)
- Express.js (HTTP API)
- MongoDB (data storage)
- Ethers.js (Ethereum interaction)
- (Optional) Testing: Jest / vitest
- (Optional) Linting: ESLint / Prettier

---

## Getting started

### Prerequisites
- Node.js (recommended 18+)
- npm / yarn / pnpm
- MongoDB instance (local or hosted)
- If using blockchain features: access to an Ethereum node / provider (Infura, Alchemy, or local)

### Install
1. Clone:
   git clone https://github.com/ian12-21/QuizApp-Backend.git
2. Install dependencies:
   npm install
   # or
   yarn
   # or
   pnpm install

### Environment variables
Create a `.env` in the project root. Common variables the backend expects:

PORT=4000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/quizapp
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d
ETH_PROVIDER_URL=https://mainnet.infura.io/v3/YOUR_KEY
CONTRACT_ADDRESS=0x...
PRIVATE_KEY=your_backend_wallet_private_key   # optional — prefer frontend signing

Add a `.env.example` that lists required variables (do not commit secrets).

### Database setup
- Ensure MongoDB is running and reachable at MONGODB_URI.
- If the project includes seed/migration scripts, run them (e.g., npm run seed).

### Run
Development (watch mode):
npm run dev

Build + run:
npm run build
npm start

Common scripts to include in package.json (if missing):
- dev — e.g., nodemon or ts-node-dev
- build — tsc
- start — node dist/index.js
- test — jest or vitest
- lint — eslint

---

## Data model (MongoDB)

Example quiz document:

```ts
{
  pin: string;
  creatorAddress: string;
  quizAddress: string;
  quizName: string;
  answersString: string;
  playerAddresses: string[];
  questions: [
    {
      question: string;
      answers: string[];
      correctAnswer: number;
    }
  ];
  winner: string; // Set after quiz ends
  createdAt: Date;
  updatedAt: Date;
}
```

User answers are typically stored in a separate collection (e.g., UserAnswers) with references to quiz and player.

---

## API endpoints (summary)
Adjust route prefixes to match code; these are the canonical endpoints used by this project:

- POST /api/quiz/create
  - Create a new quiz
  - Body example: { quizName, questions, pin?, creatorAddress? }

- GET /api/quiz/:pin
  - Retrieve quiz by PIN

- POST /api/quiz/:pin/end
  - End a quiz and determine/persist the winner

- POST /api/quiz/:quizAddress/submit-answers
  - Submit one player's answers
  - Body: { playerAddress, answers: [...] }

- POST /api/quiz/:quizAddress/submit-all-answers
  - Aggregate answers & scores and submit to blockchain (or prepare tx for frontend signing)

Authentication: protected endpoints should use Authorization: Bearer <token> if JWTs are implemented.

---

## Smart contract interaction

The backend prepares arrays of players, answers (stringified/concatenated per-player), and scores, then calls the contract:

Solidity-style function:
```solidity
function submitAllAnswers(
  address[] calldata players,
  string[] calldata answers,
  uint128[] calldata scores
) external {}
```

Options for signing:
- Backend signs and sends transactions using a server wallet (simpler, but custodial — keep PRIVATE_KEY safe).
- Backend prepares a transaction payload and returns it for frontend signing with the user's wallet (recommended for decentralization and security).

---

## Security & decentralization notes
- Avoid storing plaintext private keys in the repo or environment. Use a secrets manager.
- Prefer preparing transactions server-side and having the frontend sign them with the user's wallet when possible so users keep custody of funds and approvals.
- Validate and sanitize all inputs (especially when assembling on-chain payloads).
- Use HTTPS in production and keep JWT_SECRET and DB credentials secret.

---

## Development & testing
- Add/confirm scripts: dev, build, start, test, lint, format.
- Use a separate test database (TEST_MONGODB_URI) for integration tests.
- Implement unit tests for services that compute scores and determine winners, and integration tests for API routes.

---

## Deployment
- Build and run on a Node host or container (Docker).
- Use managed MongoDB in production (MongoDB Atlas, Atlas, or hosted provider).
- Ensure environment variables are provided by the host.
- Use a reliable Ethereum RPC provider for on-chain calls (Infura, Alchemy) and limit backend custody of signing keys.

Docker (suggestion):
- Add a Dockerfile and docker-compose that include Node service and a MongoDB service (or connect to an external MongoDB).

---

## Contributing
- Fork, create a feature branch, add tests, and open a PR.
- Keep code style consistent and add/update this README when introducing or modifying endpoints or env variables.

---

## Contact & maintainers
Repository: https://github.com/ian12-21/QuizApp-Backend
Maintainer: ian12-21 (GitHub)

---

## License
Add a LICENSE file (MIT / Apache-2.0 / your choice) and reference it here.
```
