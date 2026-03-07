# CLAUDE.md — Node.js + Express.js Project Guide

This file gives Claude Code instructions on how to structure, build, and maintain this Node.js + Express.js project. Always follow these conventions unless explicitly told otherwise.

---

## Project Structure

```
src/
│   app.js              # App entry point — keep it minimal
├── api/                # Express route controllers (thin layer only)
├── config/             # Environment variables and app configuration
├── jobs/               # Scheduled/recurring tasks (e.g. agenda.js)
├── loaders/            # Startup modules (express, db, etc.)
├── middlewares/        # Custom Express middlewares
├── models/             # Database models (Mongoose, Sequelize, etc.)
├── services/           # All business logic lives here
├── subscribers/        # Event listeners for async tasks (pub/sub)
└── utils/              # Pure helper functions, shared across layers
tests/
├── unit/               # Unit tests per service
└── integration/        # Route/API integration tests
.env                    # Local secrets — NEVER commit this
.env.example            # Committed template with placeholder values
```

---

## 3-Layer Architecture

Always follow the **Controller → Service → Model** pattern. Keep each layer doing only its job.

### Layer 1 — API / Controllers (`src/api/`)
- Accept the HTTP request
- Validate input (use a library like `joi` or `zod`)
- Call the appropriate service
- Return the HTTP response
- **Nothing else**

```js
// ✅ Correct
router.post('/users', validate(userSchema), async (req, res, next) => {
  try {
    const user = await UserService.createUser(req.body);
    return res.status(201).json(user);
  } catch (err) {
    next(err);
  }
});

// ❌ Wrong — business logic in the controller
router.post('/users', async (req, res) => {
  const user = await UserModel.create(req.body);
  await EmailService.sendWelcome(user);
  res.json(user);
});
```

### Layer 2 — Services (`src/services/`)
- All business logic lives here
- Never import `req` or `res` — services must be HTTP-agnostic
- Never return HTTP status codes or headers
- Call models/data layer for data access
- Emit events for side effects (see Pub/Sub below)

```js
// src/services/UserService.js
class UserService {
  constructor(userModel, eventEmitter) {
    this.userModel = userModel;
    this.eventEmitter = eventEmitter;
  }

  async createUser(data) {
    const user = await this.userModel.create(data);
    this.eventEmitter.emit('user:created', user);
    return user;
  }
}

module.exports = UserService;
```

### Layer 3 — Models (`src/models/`)
- Define your database schemas here
- No business logic — data shape only
- Keep queries simple and contained to the model or a repository layer

---

## Loaders (Startup Modules)

Split app startup into small, testable modules. Never dump everything into `app.js`.

```js
// src/loaders/index.js
const expressLoader = require('./express');
const mongooseLoader = require('./mongoose');

module.exports = async ({ app }) => {
  await mongooseLoader();
  await expressLoader({ app });
  // add redis, agenda, etc. here
};
```

```js
// src/app.js
const express = require('express');
const loaders = require('./loaders');

async function startServer() {
  const app = express();
  await loaders.init({ app });
  app.listen(process.env.PORT, () => {
    console.log(`Server running on port ${process.env.PORT}`);
  });
}

startServer();
```

---

## Configuration & Secrets

- Use `dotenv` to load environment variables
- Never hardcode secrets anywhere
- Always commit a `.env.example` with placeholder values — never the real `.env`
- Centralize all config in `src/config/index.js`

```js
// src/config/index.js
require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  db: {
    uri: process.env.DATABASE_URI,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
};
```

Access config like this everywhere in the app:
```js
const config = require('../config');
config.db.uri; // not process.env.DATABASE_URI
```

---

## Pub/Sub Pattern (Event-Driven Side Effects)

When an action causes side effects (emails, analytics, notifications), use events instead of calling services imperatively.

```js
// In the service — emit the event
this.eventEmitter.emit('user:created', user);

// In src/subscribers/userSubscriber.js — handle the side effects
eventEmitter.on('user:created', async (user) => {
  await EmailService.sendWelcome(user);
});

eventEmitter.on('user:created', (user) => {
  analytics.track('user_signup', user);
});
```

This keeps services small and follows the Single Responsibility Principle.

---

## Dependency Injection

Pass dependencies through constructors. This makes testing easy and avoids hidden coupling.

```js
// ✅ Correct — testable, explicit
class UserService {
  constructor(userModel, eventEmitter) {
    this.userModel = userModel;
    this.eventEmitter = eventEmitter;
  }
}

// ❌ Wrong — hidden dependency, hard to test
const UserModel = require('../models/user');
class UserService {
  async createUser(data) {
    return UserModel.create(data); // tightly coupled
  }
}
```

---

## Error Handling

- Always use `try/catch` in async route handlers and pass errors to `next(err)`
- Create a centralized error handler middleware
- Never expose stack traces or internal errors to the client in production

```js
// src/middlewares/errorHandler.js
module.exports = (err, req, res, next) => {
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';

  if (process.env.NODE_ENV !== 'production') {
    console.error(err.stack);
  }

  res.status(status).json({ error: message });
};
```

```js
// In app loader — register last
app.use(errorHandler);
```

---

## Security Best Practices

Always install and configure the following:

| Package | Purpose |
|---|---|
| `helmet` | Sets secure HTTP headers |
| `express-rate-limit` | Prevents brute force / DDoS |
| `cors` | Controls cross-origin access |
| `express-validator` or `zod` | Input validation |
| `bcrypt` | Password hashing |
| `jsonwebtoken` | Stateless auth tokens |

```js
// Helmet — always on
app.use(helmet());

// Rate limiting — on all or sensitive routes
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use('/api/', limiter);

// CORS — restrict to known origins
app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(',') }));
```

**Additional rules:**
- Never log passwords, tokens, or sensitive fields
- Always hash passwords with `bcrypt` before saving
- Validate and sanitize ALL user input — never trust the client
- Use `parameterized queries` or ORM methods — never raw string SQL
- Rotate secrets regularly; use environment-specific `.env` files

---

## Input Validation

Validate at the controller layer before it reaches the service.

```js
// Using zod (recommended)
const { z } = require('zod');

const createUserSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8),
});

// Middleware
function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ errors: result.error.errors });
    }
    req.body = result.data;
    next();
  };
}
```

---

## Authentication Pattern

Use JWT for stateless auth. Never store the JWT secret in code.

```js
// Middleware — src/middlewares/auth.js
const jwt = require('jsonwebtoken');
const config = require('../config');

module.exports = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    req.user = jwt.verify(token, config.jwt.secret);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
};
```

---

## Scalability Guidelines

- Keep route files thin — they should only route and call services
- One service per domain (UserService, OrderService, etc.)
- Use `async/await` consistently — never mix with raw callbacks
- Use a job queue (`bull`, `agenda`) for background/scheduled tasks — never `setTimeout`
- Keep models dumb — no business logic inside schema methods
- Prefer small, composable middlewares over large monolithic ones
- When your app grows, split into feature folders before splitting into microservices

---

## Testing

- Write **unit tests** for services (mock models and external dependencies)
- Write **integration tests** for routes (use `supertest`)
- Tests live in `tests/unit/` and `tests/integration/`
- Name test files after what they test: `UserService.test.js`, `auth.routes.test.js`

```js
// tests/unit/UserService.test.js
const UserService = require('../../src/services/UserService');

describe('UserService', () => {
  it('should create a user and emit user:created', async () => {
    const mockModel = { create: jest.fn().mockResolvedValue({ id: '1', email: 'test@test.com' }) };
    const mockEmitter = { emit: jest.fn() };

    const service = new UserService(mockModel, mockEmitter);
    const user = await service.createUser({ email: 'test@test.com', password: 'hashed' });

    expect(user.id).toBe('1');
    expect(mockEmitter.emit).toHaveBeenCalledWith('user:created', user);
  });
});
```

---

## Code Style Rules

- Use `async/await` — avoid `.then()/.catch()` chains
- Use `const` by default, `let` only when reassignment is needed, never `var`
- Use meaningful names — `getUserById` not `getU`, `userRecord` not `ur`
- Keep functions small and single-purpose
- Add JSDoc comments to all service methods
- Run a linter (`eslint`) and formatter (`prettier`) on every save

---

## Naming Conventions

| Type | Convention | Example |
|---|---|---|
| Files | camelCase | `userService.js` |
| Classes | PascalCase | `UserService` |
| Functions/variables | camelCase | `createUser`, `userRecord` |
| Constants | UPPER_SNAKE_CASE | `MAX_RETRIES` |
| Routes | kebab-case | `/api/user-profiles` |
| Env vars | UPPER_SNAKE_CASE | `JWT_SECRET` |

---

## What Claude Should Always Do

- Follow the 3-layer architecture — no business logic in routes
- Use the config module — never use `process.env` directly in business code
- Handle errors with `next(err)` and the central error handler
- Validate inputs before they reach the service layer
- Use dependency injection so code stays testable
- Add `helmet`, `cors`, and `rate-limit` to every new project from the start
- Keep `.env` out of git — always update `.env.example` instead

## What Claude Should Never Do

- Put SQL queries or DB calls inside route controllers
- Import `req` or `res` into a service
- Hardcode secrets, API keys, or connection strings
- Use `process.env.SOMETHING` directly outside of `src/config/index.js`
- Use `setTimeout` for background jobs — use a proper queue
- Skip input validation on any user-facing endpoint
- Return raw error stack traces to the client in production