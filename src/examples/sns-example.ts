import { CreateTopicCommand, DeleteTopicCommand, PublishCommand, SubscribeCommand, UnsubscribeCommand } from "@aws-sdk/client-sns";
import { CreateQueueCommand, DeleteMessageCommand, DeleteQueueCommand, GetQueueAttributesCommand, GetQueueUrlCommand, ReceiveMessageCommand } from "@aws-sdk/client-sqs";
import { snsClient, sqsClient } from "../utils/client.js";

const TOPIC_NAME = "my-example-topic";
const QUEUE_NAME = "my-sns-subscriber-queue";

async function createTopicAndQueue(): Promise<{ topicArn: string; queueUrl: string; queueArn: string }> {
  console.log(`Creating SNS topic '${TOPIC_NAME}'...`);
  const { TopicArn } = await snsClient.send(new CreateTopicCommand({ Name: TOPIC_NAME }));
  console.log(`  Topic ARN: ${TopicArn}\n`);

  console.log(`Creating SQS queue '${QUEUE_NAME}'...`);
  await sqsClient.send(new CreateQueueCommand({ QueueName: QUEUE_NAME }));
  const { QueueUrl } = await sqsClient.send(new GetQueueUrlCommand({ QueueName: QUEUE_NAME }));

  const { Attributes } = await sqsClient.send(
    new GetQueueAttributesCommand({ QueueUrl: QueueUrl!, AttributeNames: ["QueueArn"] })
  );
  const queueArn = Attributes?.["QueueArn"] ?? "";

  console.log(`  Queue URL: ${QueueUrl}`);
  console.log(`  Queue ARN: ${queueArn}\n`);

  return { topicArn: TopicArn!, queueUrl: QueueUrl!, queueArn };
}

async function subscribeQueueToTopic(topicArn: string, queueArn: string): Promise<string> {
  console.log("Subscribing SQS queue to SNS topic...");

  const { SubscriptionArn } = await snsClient.send(
    new SubscribeCommand({ TopicArn: topicArn, Protocol: "sqs", Endpoint: queueArn })
  );

  console.log(`  Subscription ARN: ${SubscriptionArn}\n`);
  return SubscriptionArn!;
}

async function publishMessages(topicArn: string): Promise<void> {
  const messages = [
    { subject: "UserSignedUp", body: JSON.stringify({ userId: "u-001", email: "alice@example.com" }) },
    { subject: "OrderPlaced",  body: JSON.stringify({ orderId: "ord-001", amount: 99.99 }) },
  ];

  console.log(`Publishing ${messages.length} messages to topic...\n`);

  for (const msg of messages) {
    const { MessageId } = await snsClient.send(
      new PublishCommand({ TopicArn: topicArn, Subject: msg.subject, Message: msg.body })
    );
    console.log(`  [PUBLISHED] ${msg.subject} — MessageId: ${MessageId}`);
  }

  console.log();
}

async function receiveMessages(queueUrl: string): Promise<void> {
  console.log("Receiving messages from SQS queue...\n");

  let totalProcessed = 0;

  while (true) {
    const response = await sqsClient.send(
      new ReceiveMessageCommand({ QueueUrl: queueUrl, MaxNumberOfMessages: 10, WaitTimeSeconds: 2 })
    );

    const messages = response.Messages ?? [];
    if (messages.length === 0) break;

    for (const message of messages) {
      const snsEnvelope = JSON.parse(message.Body ?? "{}");
      const payload = JSON.parse(snsEnvelope.Message ?? "{}");

      console.log(`  [${snsEnvelope.Subject}]`);
      console.log(`    Payload:   ${JSON.stringify(payload)}`);
      console.log(`    SNS MsgId: ${snsEnvelope.MessageId}\n`);

      await sqsClient.send(
        new DeleteMessageCommand({ QueueUrl: queueUrl, ReceiptHandle: message.ReceiptHandle! })
      );

      totalProcessed++;
    }
  }

  console.log(`  Total processed: ${totalProcessed}\n`);
}

async function cleanup(topicArn: string, subscriptionArn: string, queueUrl: string): Promise<void> {
  console.log("Cleaning up...");
  await snsClient.send(new UnsubscribeCommand({ SubscriptionArn: subscriptionArn }));
  await snsClient.send(new DeleteTopicCommand({ TopicArn: topicArn }));
  await sqsClient.send(new DeleteQueueCommand({ QueueUrl: queueUrl }));
  console.log("  Topic, subscription, and queue deleted.");
}

async function main(): Promise<void> {
  const { topicArn, queueUrl, queueArn } = await createTopicAndQueue();
  const subscriptionArn = await subscribeQueueToTopic(topicArn, queueArn);
  await publishMessages(topicArn);
  await receiveMessages(queueUrl);
  await cleanup(topicArn, subscriptionArn, queueUrl);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
