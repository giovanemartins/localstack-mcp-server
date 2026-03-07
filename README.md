# LocalStack MCP Server

MCP server that exposes LocalStack-managed AWS services as AI-agent tools, enabling LLMs and AI agents to interact with local AWS infrastructure during development and testing.

## Requirements

- Node.js 20+
- pnpm 9+
- Docker (for LocalStack)

## Quick Start

```bash
# 1. Start LocalStack
docker compose up -d

# 2. Install dependencies
pnpm install

# 3. Build
pnpm run build

# 4. Run
pnpm start
```

## Configuration

All configuration is via environment variables:

| Variable | Default | Description |
|---|---|---|
| `LOCALSTACK_ENDPOINT` | `http://localhost:4566` | LocalStack base URL |
| `AWS_REGION` | `us-east-1` | AWS region |
| `AWS_ACCESS_KEY_ID` | `test` | Fake credentials for LocalStack |
| `AWS_SECRET_ACCESS_KEY` | `test` | Fake credentials for LocalStack |

## Running Tests

Requires LocalStack running (`docker compose up -d`).

```bash
pnpm test
```

## MCP Client Configuration

Add to your MCP client config (e.g. `~/.config/claude/claude_desktop_config.json` MCP settings):

```json
{
  "mcpServers": {
    "localstack": {
      "command": "node",
      "args": ["/path/to/mcp-servers/localstack/dist/index.js"],
      "env": {
        "LOCALSTACK_ENDPOINT": "http://localhost:4566",
        "AWS_REGION": "us-east-1",
        "AWS_ACCESS_KEY_ID": "test",
        "AWS_SECRET_ACCESS_KEY": "test"
      }
    }
  }
}
```

Or with `tsx` for development (no build step required):

```json
{
  "mcpServers": {
    "localstack": {
      "command": "npx",
      "args": ["tsx", "/path/to/mcp-servers/localstack/src/index.ts"],
      "env": {
        "LOCALSTACK_ENDPOINT": "http://localhost:4566",
        "AWS_REGION": "us-east-1",
        "AWS_ACCESS_KEY_ID": "test",
        "AWS_SECRET_ACCESS_KEY": "test"
      }
    }
  }
}
```

---

## Available Tools

### S3

| Tool | Description |
|---|---|
| `s3_list_buckets` | List all S3 buckets |
| `s3_create_bucket` | Create a bucket |
| `s3_delete_bucket` | Delete a bucket |
| `s3_put_object` | Upload an object (text/JSON content) |
| `s3_get_object` | Download an object as text |
| `s3_delete_object` | Delete an object |
| `s3_list_objects` | List objects with optional prefix filter |

### SQS

| Tool | Description |
|---|---|
| `sqs_list_queues` | List all queues |
| `sqs_create_queue` | Create a standard or FIFO queue |
| `sqs_delete_queue` | Delete a queue |
| `sqs_send_message` | Send a message |
| `sqs_receive_messages` | Receive up to 10 messages (with long-polling support) |
| `sqs_delete_message` | Delete a message by receipt handle |
| `sqs_purge_queue` | Purge all messages from a queue |

### SNS

| Tool | Description |
|---|---|
| `sns_list_topics` | List all topics |
| `sns_create_topic` | Create a standard or FIFO topic |
| `sns_delete_topic` | Delete a topic |
| `sns_subscribe` | Subscribe an endpoint to a topic |
| `sns_unsubscribe` | Unsubscribe from a topic |
| `sns_list_subscriptions_by_topic` | List all subscriptions for a topic |
| `sns_publish` | Publish a message to a topic |

### EventBridge

| Tool | Description |
|---|---|
| `eventbridge_list_buses` | List all event buses |
| `eventbridge_create_bus` | Create a custom event bus |
| `eventbridge_delete_bus` | Delete a custom event bus |
| `eventbridge_list_rules` | List rules on a bus |
| `eventbridge_put_rule` | Create or update a rule (event pattern or schedule) |
| `eventbridge_delete_rule` | Delete a rule |
| `eventbridge_describe_rule` | Describe a rule |
| `eventbridge_enable_rule` | Enable a rule |
| `eventbridge_disable_rule` | Disable a rule |
| `eventbridge_put_targets` | Add or update rule targets |
| `eventbridge_list_targets` | List targets for a rule |
| `eventbridge_remove_targets` | Remove targets from a rule |
| `eventbridge_put_events` | Send custom events to a bus (max 10) |

### Kinesis

| Tool | Description |
|---|---|
| `kinesis_list_streams` | List all streams |
| `kinesis_create_stream` | Create a stream |
| `kinesis_delete_stream` | Delete a stream |
| `kinesis_describe_stream` | Describe a stream (status, shards) |
| `kinesis_put_record` | Put a single record |
| `kinesis_put_records` | Put multiple records (max 500) |
| `kinesis_get_records` | Get records from a shard |

### DynamoDB

| Tool | Description |
|---|---|
| `dynamodb_list_tables` | List all tables |
| `dynamodb_create_table` | Create a table (partition key + optional sort key) |
| `dynamodb_delete_table` | Delete a table |
| `dynamodb_describe_table` | Describe a table |
| `dynamodb_put_item` | Put (create or replace) an item |
| `dynamodb_get_item` | Get an item by key |
| `dynamodb_delete_item` | Delete an item by key |
| `dynamodb_scan` | Scan all items (with optional filter expression) |
| `dynamodb_query` | Query by key condition |

### Lambda

| Tool | Description |
|---|---|
| `lambda_list_functions` | List all functions |
| `lambda_get_function` | Get function details |
| `lambda_create_function` | Create a function from a base64-encoded ZIP |
| `lambda_delete_function` | Delete a function |
| `lambda_invoke` | Invoke a function and return its response + logs |

### Secrets Manager

| Tool | Description |
|---|---|
| `secretsmanager_list_secrets` | List all secrets |
| `secretsmanager_create_secret` | Create a new secret |
| `secretsmanager_get_secret` | Get the value of a secret |
| `secretsmanager_update_secret` | Update the value of a secret |
| `secretsmanager_describe_secret` | Describe secret metadata |
| `secretsmanager_delete_secret` | Delete a secret (with optional force delete) |
| `secretsmanager_restore_secret` | Restore a previously deleted secret |

### SSM Parameter Store

| Tool | Description |
|---|---|
| `ssm_get_parameter` | Get a parameter by name |
| `ssm_put_parameter` | Create or update a parameter |
| `ssm_delete_parameter` | Delete a parameter |
| `ssm_delete_parameters` | Delete up to 10 parameters in batch |
| `ssm_get_parameters_by_path` | Get all parameters under a path prefix |
| `ssm_describe_parameters` | List and describe parameters |

### SES

| Tool | Description |
|---|---|
| `ses_list_identities` | List all verified identities |
| `ses_verify_email_identity` | Verify an email address |
| `ses_get_identity_verification_attributes` | Get verification status for identities |
| `ses_delete_identity` | Delete an identity |
| `ses_send_email` | Send an email (plain text and/or HTML) |

---

## Use Cases

- **Dev environment bootstrap** — create S3 buckets, SQS queues, DynamoDB tables, and SSM parameters in one shot from a spec
- **Test data seeding** — populate DynamoDB or S3 before running integration tests
- **Event-driven debugging** — publish to EventBridge/SNS/Kinesis and inspect downstream effects without leaving the IDE
- **Secret/config management** — read and update Secrets Manager / SSM values during local debug sessions
- **Lambda smoke testing** — invoke Lambda functions, capture responses and logs, iterate quickly
- **Queue drain / inspect** — receive and inspect SQS messages without a consumer running

---

## Project Structure

```
localstack/
├── docker-compose.yml      # LocalStack container
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── src/
│   ├── index.ts            # MCP server entry point
│   ├── config.ts           # Environment config
│   ├── tools/              # One file per AWS service
│   │   ├── s3.ts
│   │   ├── sqs.ts
│   │   ├── sns.ts
│   │   ├── eventbridge.ts
│   │   ├── kinesis.ts
│   │   ├── dynamodb.ts
│   │   ├── lambda.ts
│   │   ├── secretsmanager.ts
│   │   ├── ssm.ts
│   │   └── ses.ts
│   └── utils/
│       ├── client.ts       # Shared AWS client factory (LocalStack endpoint)
│       └── errors.ts       # Standardised MCP error formatting
└── tests/                  # Integration tests (real LocalStack)
    ├── s3.test.ts
    ├── sqs.test.ts
    ├── sns.test.ts
    ├── eventbridge.test.ts
    ├── kinesis.test.ts
    ├── dynamodb.test.ts
    ├── lambda.test.ts
    ├── secretsmanager.test.ts
    ├── ssm.test.ts
    └── ses.test.ts
```
