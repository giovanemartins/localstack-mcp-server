import {
  CreateQueueCommand,
  DeleteMessageCommand,
  DeleteQueueCommand,
  GetQueueUrlCommand,
  ReceiveMessageCommand,
  SendMessageBatchCommand,
} from "@aws-sdk/client-sqs";
import { sqsClient } from "../utils/client.js";

const QUEUE_NAME = "my-example-queue";

const MESSAGES = [
  { id: "msg-1", body: JSON.stringify({ event: "UserSignedUp", userId: "u-001" }) },
  { id: "msg-2", body: JSON.stringify({ event: "OrderPlaced", orderId: "ord-001", amount: 49.99 }) },
  { id: "msg-3", body: JSON.stringify({ event: "PaymentProcessed", orderId: "ord-001", status: "success" }) },
];

async function createQueue(): Promise<string> {
  console.log(`Creating queue '${QUEUE_NAME}'...`);

  await sqsClient.send(new CreateQueueCommand({ QueueName: QUEUE_NAME }));

  const { QueueUrl } = await sqsClient.send(
    new GetQueueUrlCommand({ QueueName: QUEUE_NAME })
  );

  console.log(`  Queue URL: ${QueueUrl}\n`);
  return QueueUrl!;
}

async function sendMessages(queueUrl: string): Promise<void> {
  console.log(`Sending ${MESSAGES.length} messages in batch...`);

  const result = await sqsClient.send(
    new SendMessageBatchCommand({
      QueueUrl: queueUrl,
      Entries: MESSAGES.map((m) => ({ Id: m.id, MessageBody: m.body })),
    })
  );

  console.log(`  Successful: ${result.Successful?.length ?? 0}`);
  console.log(`  Failed:     ${result.Failed?.length ?? 0}\n`);
}

async function receiveAndProcessMessages(queueUrl: string): Promise<void> {
  console.log("Receiving and processing messages...\n");

  let totalProcessed = 0;

  while (true) {
    const response = await sqsClient.send(
      new ReceiveMessageCommand({
        QueueUrl: queueUrl,
        MaxNumberOfMessages: 10,
        WaitTimeSeconds: 2,
      })
    );

    const messages = response.Messages ?? [];
    if (messages.length === 0) break;

    for (const message of messages) {
      const body = JSON.parse(message.Body ?? "{}");
      console.log(`  [${body.event}]`);
      console.log(`    Payload:    ${JSON.stringify(body)}`);
      console.log(`    MessageId:  ${message.MessageId}\n`);

      await sqsClient.send(
        new DeleteMessageCommand({
          QueueUrl: queueUrl,
          ReceiptHandle: message.ReceiptHandle!,
        })
      );

      totalProcessed++;
    }
  }

  console.log(`  Total processed: ${totalProcessed}\n`);
}

async function deleteQueue(queueUrl: string): Promise<void> {
  console.log(`Cleaning up — deleting queue '${QUEUE_NAME}'...`);
  await sqsClient.send(new DeleteQueueCommand({ QueueUrl: queueUrl }));
  console.log("  Queue deleted.");
}

async function main(): Promise<void> {
  const queueUrl = await createQueue();
  await sendMessages(queueUrl);
  await receiveAndProcessMessages(queueUrl);
  await deleteQueue(queueUrl);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
