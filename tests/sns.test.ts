import {
  CreateTopicCommand,
  DeleteTopicCommand,
  ListSubscriptionsByTopicCommand,
  ListTopicsCommand,
  PublishCommand,
  SNSClient,
  SubscribeCommand,
  UnsubscribeCommand,
} from "@aws-sdk/client-sns";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { config } from "../src/config.js";

const client = new SNSClient({
  endpoint: config.endpoint,
  region: config.region,
  credentials: config.credentials,
});

const TOPIC_NAME = `test-topic-${Date.now()}`;
let topicArn: string;

beforeAll(async () => {
  const result = await client.send(new CreateTopicCommand({ Name: TOPIC_NAME }));
  topicArn = result.TopicArn!;
});

afterAll(async () => {
  await client.send(new DeleteTopicCommand({ TopicArn: topicArn }));
});

describe("SNS — list topics", () => {
  it("returns the test topic in the list", async () => {
    const result = await client.send(new ListTopicsCommand({}));
    const arns = (result.Topics ?? []).map((t) => t.TopicArn);
    expect(arns).toContain(topicArn);
  });
});

describe("SNS — create & delete topic", () => {
  const ephemeralName = `ephemeral-${Date.now()}`;
  let ephemeralArn: string;

  it("creates a topic and returns its ARN", async () => {
    const result = await client.send(new CreateTopicCommand({ Name: ephemeralName }));
    expect(result.TopicArn).toBeDefined();
    ephemeralArn = result.TopicArn!;
  });

  it("deletes the topic successfully", async () => {
    await expect(
      client.send(new DeleteTopicCommand({ TopicArn: ephemeralArn }))
    ).resolves.toBeDefined();
  });
});

describe("SNS — subscribe & unsubscribe", () => {
  let subscriptionArn: string;

  it("subscribes an SQS-like endpoint (email for LocalStack)", async () => {
    const result = await client.send(
      new SubscribeCommand({
        TopicArn: topicArn,
        Protocol: "email",
        Endpoint: "test@example.com",
      })
    );
    expect(result.SubscriptionArn).toBeDefined();
    subscriptionArn = result.SubscriptionArn!;
  });

  it("lists subscriptions for the topic", async () => {
    const result = await client.send(
      new ListSubscriptionsByTopicCommand({ TopicArn: topicArn })
    );
    expect(result.Subscriptions?.length).toBeGreaterThan(0);
  });

  it("unsubscribes successfully", async () => {
    await expect(
      client.send(new UnsubscribeCommand({ SubscriptionArn: subscriptionArn }))
    ).resolves.toBeDefined();
  });
});

describe("SNS — publish", () => {
  it("publishes a message and returns a MessageId", async () => {
    const result = await client.send(
      new PublishCommand({
        TopicArn: topicArn,
        Message: JSON.stringify({ event: "test", timestamp: Date.now() }),
        Subject: "Test event",
      })
    );
    expect(result.MessageId).toBeDefined();
  });
});
