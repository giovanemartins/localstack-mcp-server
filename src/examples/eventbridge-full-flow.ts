import { PutEventsCommand } from "@aws-sdk/client-eventbridge";
import { DeleteMessageCommand, ReceiveMessageCommand } from "@aws-sdk/client-sqs";
import { eventBridgeClient, sqsClient } from "../utils/client.js";

const EVENT_BUS_NAME = "my-event-bus";
const QUEUE_URL =
  "http://sqs.us-east-1.localhost.localstack.cloud:4566/000000000000/my-event-queue";

async function publishEvents(): Promise<void> {
  console.log("Publishing events to EventBridge...\n");

  const result = await eventBridgeClient.send(
    new PutEventsCommand({
      Entries: [
        {
          EventBusName: EVENT_BUS_NAME,
          Source: "myapp.orders",
          DetailType: "OrderPlaced",
          Detail: JSON.stringify({ orderId: "ord-001", amount: 99.99, currency: "USD" }),
        },
        {
          EventBusName: EVENT_BUS_NAME,
          Source: "myapp.orders",
          DetailType: "OrderShipped",
          Detail: JSON.stringify({ orderId: "ord-002", trackingCode: "TRK-XYZ" }),
        },
      ],
    })
  );

  console.log(`  Published: ${result.Entries?.length} event(s), failed: ${result.FailedEntryCount}\n`);
}

async function consumeEvents(): Promise<void> {
  console.log("Consuming events from SQS queue...\n");

  const response = await sqsClient.send(
    new ReceiveMessageCommand({
      QueueUrl: QUEUE_URL,
      MaxNumberOfMessages: 10,
      WaitTimeSeconds: 3,
    })
  );

  const messages = response.Messages ?? [];

  if (messages.length === 0) {
    console.log("  No messages received.");
    return;
  }

  console.log(`  Received ${messages.length} message(s):\n`);

  for (const message of messages) {
    const body = JSON.parse(message.Body ?? "{}");
    const detail = typeof body.detail === "string" ? JSON.parse(body.detail) : body.detail;

    console.log(`  [${body["detail-type"]}]`);
    console.log(`    Source:  ${body.source}`);
    console.log(`    Detail:  ${JSON.stringify(detail)}`);
    console.log(`    EventId: ${body.id}\n`);

    await sqsClient.send(
      new DeleteMessageCommand({
        QueueUrl: QUEUE_URL,
        ReceiptHandle: message.ReceiptHandle!,
      })
    );
  }

  console.log("  All messages processed and deleted from queue.");
}

async function main(): Promise<void> {
  await publishEvents();
  await consumeEvents();
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
