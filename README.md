# QuizApp-Backend

QuizApp-Backend is the backend service for a decentralized quiz platform. It exposes a REST API that supports the full quiz lifecycle—creating quizzes, letting players join and submit answers, storing quiz/answer data in MongoDB, calculating winners, and optionally preparing or submitting aggregated results to an Ethereum smart contract for transparent, on-chain verification.

---

## What this repository does

### 1) Quiz lifecycle API
This backend provides endpoints to:
- Create a quiz (quiz metadata + questions)
- Fetch a quiz by PIN so players can join
- Accept player answer submissions and persist them
- End a quiz, compute scores, and persist the winner
- Aggregate all players’ answers/scores and interact with a smart contract (optional)

### 2) Data persistence (MongoDB)
The service stores:
- Quiz documents (PIN, creator, quiz contract address, questions, players, winner, timestamps)
- Player answers in a separate collection (e.g., `UserAnswers`) linked to the quiz/player

Example quiz shape:
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

### 3) Smart contract integration (Ethereum via Ethers.js)
When enabled, the backend can aggregate all players’ answers and scores and call a smart contract function like:
```solidity
function submitAllAnswers(
  address[] calldata players,
  string[] calldata answers,
  uint128[] calldata scores
) external {}
```

Signing options:
- **Backend signs & sends** the transaction (requires a server private key; custodial).
- **Backend prepares tx data** and returns it so the **frontend signs** with the user’s wallet (recommended for decentralization and security).

---

## Core features

- Quiz creation and management
- Player join flow via PIN
- Answer submission and storage
- Winner determination and persistence
- Optional on-chain submission/preparation of results
- Express.js REST API for frontend integration

---

## Tech stack

- Node.js + **TypeScript**
- **Express.js**
- **MongoDB**
- **Ethers.js** (blockchain interaction)

---

## API endpoints (summary)

(Adjust prefixes to match the codebase if needed.)

- `POST /api/quiz/create` — Create new quiz
- `GET /api/quiz/:pin` — Get quiz by PIN
- `POST /api/quiz/:pin/end` — End quiz and set winner
- `POST /api/quiz/:quizAddress/submit-answers` — Submit a player’s answers
- `POST /api/quiz/:quizAddress/submit-all-answers` — Aggregate and submit/prepare answers & scores for blockchain

---

## Security notes

- Do not commit secrets (Mongo URI, JWT secret, private keys).
- Prefer frontend wallet signing when possible (non-custodial).
- Validate/sanitize inputs, especially anything that becomes part of an on-chain payload.
- Use HTTPS in production and a proper secrets manager for production deployments.

---
