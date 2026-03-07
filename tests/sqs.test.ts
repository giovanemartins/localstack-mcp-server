import {
  CreateQueueCommand,
  DeleteMessageCommand,
  DeleteQueueCommand,
  GetQueueUrlCommand,
  ListQueuesCommand,
  PurgeQueueCommand,
  ReceiveMessageCommand,
  SendMessageCommand,
  SQSClient,
} from "@aws-sdk/client-sqs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { config } from "../src/config.js";

const client = new SQSClient({
  endpoint: config.endpoint,
  region: config.region,
  credentials: config.credentials,
});

const QUEUE_NAME = `test-queue-${Date.now()}`;
let queueUrl: string;

beforeAll(async () => {
  const result = await client.send(
    new CreateQueueCommand({ QueueName: QUEUE_NAME })
  );
  queueUrl = result.QueueUrl!;
});

afterAll(async () => {
  await client.send(new DeleteQueueCommand({ QueueUrl: queueUrl }));
});

describe("SQS — list queues", () => {
  it("returns the test queue in the list", async () => {
    const result = await client.send(
      new ListQueuesCommand({ QueueNamePrefix: QUEUE_NAME })
    );
    expect(result.QueueUrls ?? []).toContain(queueUrl);
  });
});

describe("SQS — create & delete queue", () => {
  const ephemeralQueue = `ephemeral-${Date.now()}`;
  let ephemeralUrl: string;

  it("creates a queue and returns its URL", async () => {
    const result = await client.send(
      new CreateQueueCommand({ QueueName: ephemeralQueue })
    );
    expect(result.QueueUrl).toBeDefined();
    ephemeralUrl = result.QueueUrl!;
  });

  it("deletes the queue successfully", async () => {
    await expect(
      client.send(new DeleteQueueCommand({ QueueUrl: ephemeralUrl }))
    ).resolves.toBeDefined();
  });
});

describe("SQS — send & receive message", () => {
  let receiptHandle: string;

  it("sends a message and returns a MessageId", async () => {
    const result = await client.send(
      new SendMessageCommand({
        QueueUrl: queueUrl,
        MessageBody: JSON.stringify({ hello: "localstack" }),
      })
    );
    expect(result.MessageId).toBeDefined();
  });

  it("receives the message from the queue", async () => {
    const result = await client.send(
      new ReceiveMessageCommand({
        QueueUrl: queueUrl,
        MaxNumberOfMessages: 1,
        WaitTimeSeconds: 1,
      })
    );
    expect(result.Messages).toHaveLength(1);
    expect(result.Messages![0].Body).toBe(
      JSON.stringify({ hello: "localstack" })
    );
    receiptHandle = result.Messages![0].ReceiptHandle!;
  });

  it("deletes the message using the receipt handle", async () => {
    await expect(
      client.send(
        new DeleteMessageCommand({ QueueUrl: queueUrl, ReceiptHandle: receiptHandle })
      )
    ).resolves.toBeDefined();
  });
});

describe("SQS — purge queue", () => {
  it("sends messages then purges the queue", async () => {
    await client.send(
      new SendMessageCommand({ QueueUrl: queueUrl, MessageBody: "msg1" })
    );
    await client.send(
      new SendMessageCommand({ QueueUrl: queueUrl, MessageBody: "msg2" })
    );

    await expect(
      client.send(new PurgeQueueCommand({ QueueUrl: queueUrl }))
    ).resolves.toBeDefined();
  });

  it("queue is empty after purge", async () => {
    await new Promise((r) => setTimeout(r, 500));
    const result = await client.send(
      new ReceiveMessageCommand({
        QueueUrl: queueUrl,
        MaxNumberOfMessages: 10,
        WaitTimeSeconds: 0,
      })
    );
    expect(result.Messages ?? []).toHaveLength(0);
  });
});

describe("SQS — get queue URL", () => {
  it("resolves the queue URL by name", async () => {
    const result = await client.send(
      new GetQueueUrlCommand({ QueueName: QUEUE_NAME })
    );
    expect(result.QueueUrl).toBe(queueUrl);
  });
});
