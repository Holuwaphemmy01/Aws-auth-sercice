# aws-auth-service

A small AWS Lambda-style auth service (TypeScript) with register and login handlers, DynamoDB-backed user storage, password hashing, and JWT tokens. Intended for local development and unit testing.

## Features

- Register new users (stores hashed password in DynamoDB)
- Login with email/password and receive JWT access and refresh tokens
- Input validation with Zod
- Small, test-friendly codebase with Jest tests

## Requirements

- Node.js 18+ (recommended)
- npm
- An AWS account or a local DynamoDB instance for integration runs (unit tests use mocks)

## Quick start (development)

1. Install dependencies

```powershell
npm install
```

2. Create a `.env` file in the project root with the variables below (example):

```powershell
# .env
TABLE_NAME=YourDynamoTableName
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret
JWT_SECRET=some-very-secret-value
```

> Note: `JWT_SECRET` falls back to `dev-secret` if not provided, but always set a strong secret for real deployments.

3. Run tests

```powershell
npm test
```

## Environment variables

- TABLE_NAME (required) — DynamoDB table name used to store users
- AWS_REGION — AWS region (default: `us-east-1`)
- AWS_ACCESS_KEY_ID — AWS credentials (required if not using a local DynamoDB emulator)
- AWS_SECRET_ACCESS_KEY — AWS credentials secret
- JWT_SECRET — secret used to sign JWTs (defaults to `dev-secret`)

## API

The project exposes two main handlers in `src/handlers/auth.ts` (used as Lambda handlers in examples). They expect an HTTP-style event with a JSON body. Example payloads and responses below use the handler contract found in the codebase.

### Register (POST /register)

Request body

```json
{
  "name": "Alice",
  "email": "alice@example.com",
  "password": "supersecret123"
}
```

Success response (201)

```json
{
  "message": "Registered successfully"
}
```

Errors

- 400 — malformed JSON or validation error
- 409 — user already exists (errorCode: `USER_EXISTS`)
- 500 — internal server error (errorCode: `INTERNAL_ERROR`)

### Login (POST /login)

Request body

```json
{
  "email": "alice@example.com",
  "password": "supersecret123"
}
```

Success response (200)

```json
{
  "accessToken": "<jwt-access-token>",
  "refreshToken": "<jwt-refresh-token>"
}
```

Errors

- 400 — malformed JSON or validation error
- 401 — invalid credentials (errorCode: `INVALID_CREDENTIALS`)
- 500 — internal server error (errorCode: `INTERNAL_ERROR`)

## Code layout

- `src/handlers/auth.ts` — register & login handlers and Lambda-style response helper
- `src/lib/db.ts` — DynamoDB helpers (getUserByEmail, putUser, updateLoginMeta)
- `src/lib/crypto.ts` — password hashing & verification (bcryptjs)
- `src/lib/jwt.ts` — JWT token generation
- `src/lib/validation.ts` — Zod schemas and parsers
- `tests/` — Jest tests covering handlers and libs

## Local development tips

- If you don't want to hit AWS during development, you can run a local DynamoDB (DynamoDB Local) and point `TABLE_NAME` and `AWS_*` env vars accordingly, or mock DynamoDB in tests (the repo already uses aws-sdk-client-mock in devDependencies).
- Keep `JWT_SECRET` consistent between tests and local runs if you need deterministic tokens.

## Troubleshooting

- "TABLE_NAME environment variable is required" on startup: create a `.env` with `TABLE_NAME` set or export it in your shell.
- Permission/credentials errors: ensure `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` are set and have DynamoDB permissions, or run a local DynamoDB.
- Tests failing: run with `npm test -- -i` to avoid watch mode if needed; check stack traces in `tests/*.test.ts`.

## Contributing

Contributions are welcome. Please run tests and follow the existing code style.

## License

MIT — see repository license (if any).
