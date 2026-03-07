# Contributing

Thank you for your interest in contributing! This document explains how to get started.

## Requirements

- Node.js 20+
- pnpm 9+
- Docker (for LocalStack)

## Setup

```bash
# 1. Fork and clone the repo
git clone git@github.com:<your-username>/localstack-mcp-server.git
cd localstack-mcp-server

# 2. Install dependencies
pnpm install

# 3. Start LocalStack
docker compose up -d

# 4. Build
pnpm run build
```

## Development Workflow

Use `tsx` watch mode for a faster feedback loop — no build step needed:

```bash
pnpm dev
```

Run the linter (TypeScript type check):

```bash
pnpm lint
```

## Running Tests

All tests are integration tests and require LocalStack to be running.

```bash
docker compose up -d
pnpm test
```

Tests are located in `tests/`, one file per AWS service. Each test file is self-contained and cleans up after itself.

## Project Structure

```text
src/
├── index.ts          # MCP server entry point — registers all tools
├── config.ts         # Environment variable configuration
├── tools/            # One file per AWS service — add new tools here
│   ├── s3.ts
│   ├── sqs.ts
│   └── ...
└── utils/
    ├── client.ts     # Shared AWS SDK client instances (LocalStack endpoint)
    └── errors.ts     # Standardised MCP error formatting
```

## Adding a New AWS Service

1. **Create the tool file** — add `src/tools/<service>.ts` following the pattern of an existing tool (e.g. `src/tools/sqs.ts`):
   - Export a single `register<Service>Tools(server: McpServer): void` function
   - Use the shared client from `../utils/client.ts`
   - Wrap errors with `toMcpError` from `../utils/errors.ts`

2. **Add the client** — if the service needs a new AWS SDK client, add it to `src/utils/client.ts`

3. **Register the tools** — import and call `register<Service>Tools(server)` in `src/index.ts`

4. **Write tests** — add `tests/<service>.test.ts` that covers the main operations and cleans up any created resources

5. **Update the README** — add the new tools to the Available Tools table in `README.md`

## Adding Examples

Place standalone runnable scripts in `src/examples/`. Each example should:

- Be self-contained and runnable via `npx tsx src/examples/<name>.ts`
- Create any required resources, demonstrate the usage, then clean up

## Commit Messages

This project follows [Conventional Commits](https://www.conventionalcommits.org/):

| Type | When to use |
| --- | --- |
| `feat` | New tool, new service, new example |
| `fix` | Bug fix |

Examples:

```text
feat: add SES tools (send email, verify identity)
fix: handle empty Attributes response in SQS GetQueueAttributes
docs: add kinesis example to examples folder
test: add DynamoDB query integration test
```

## Pull Request Guidelines

- Keep PRs focused — one feature or fix per PR
- Make sure `pnpm lint` passes before opening a PR
- Make sure all tests pass (`pnpm test`) with LocalStack running
- Include a short description of what changed and why
