import {
  CreateQueueCommand,
  DeleteMessageCommand,
  DeleteQueueCommand,
  GetQueueUrlCommand,
  ListQueuesCommand,
  PurgeQueueCommand,
  ReceiveMessageCommand,
  SendMessageCommand,
} from "@aws-sdk/client-sqs";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { sqsClient } from "../utils/client.js";
import { toMcpError } from "../utils/errors.js";

export function registerSqsTools(server: McpServer): void {
  server.tool(
    "sqs_list_queues",
    "List all SQS queues in LocalStack",
    {
      prefix: z.string().optional().describe("Filter queues by name prefix"),
    },
    async ({ prefix }) => {
      try {
        const result = await sqsClient.send(
          new ListQueuesCommand({ QueueNamePrefix: prefix })
        );
        const urls = result.QueueUrls ?? [];
        return {
          content: [{ type: "text", text: JSON.stringify(urls, null, 2) }],
        };
      } catch (error) {
        return toMcpError(error);
      }
    }
  );

  server.tool(
    "sqs_create_queue",
    "Create a new SQS queue in LocalStack",
    {
      name: z.string().min(1).describe("Queue name (append .fifo for FIFO queues)"),
      fifo: z.boolean().optional().describe("Create as a FIFO queue (name must end with .fifo)"),
      visibilityTimeout: z.number().int().min(0).max(43200).optional().describe("Visibility timeout in seconds"),
    },
    async ({ name, fifo, visibilityTimeout }) => {
      try {
        const attributes: Record<string, string> = {};
        if (fifo) attributes["FifoQueue"] = "true";
        if (visibilityTimeout !== undefined) {
          attributes["VisibilityTimeout"] = String(visibilityTimeout);
        }
        const result = await sqsClient.send(
          new CreateQueueCommand({
            QueueName: name,
            Attributes: Object.keys(attributes).length > 0 ? attributes : undefined,
          })
        );
        return {
          content: [{ type: "text", text: `Queue created: ${result.QueueUrl}` }],
        };
      } catch (error) {
        return toMcpError(error);
      }
    }
  );

  server.tool(
    "sqs_delete_queue",
    "Delete an SQS queue from LocalStack",
    {
      queueName: z.string().min(1).describe("Queue name"),
    },
    async ({ queueName }) => {
      try {
        const { QueueUrl } = await sqsClient.send(
          new GetQueueUrlCommand({ QueueName: queueName })
        );
        await sqsClient.send(new DeleteQueueCommand({ QueueUrl }));
        return {
          content: [{ type: "text", text: `Queue '${queueName}' deleted successfully.` }],
        };
      } catch (error) {
        return toMcpError(error);
      }
    }
  );

  server.tool(
    "sqs_send_message",
    "Send a message to an SQS queue in LocalStack",
    {
      queueName: z.string().min(1).describe("Queue name"),
      body: z.string().min(1).describe("Message body"),
      delaySeconds: z.number().int().min(0).max(900).optional().describe("Delay in seconds before the message becomes visible"),
      messageGroupId: z.string().optional().describe("Required for FIFO queues"),
      messageDeduplicationId: z.string().optional().describe("Deduplication ID for FIFO queues"),
    },
    async ({ queueName, body, delaySeconds, messageGroupId, messageDeduplicationId }) => {
      try {
        const { QueueUrl } = await sqsClient.send(
          new GetQueueUrlCommand({ QueueName: queueName })
        );
        const result = await sqsClient.send(
          new SendMessageCommand({
            QueueUrl,
            MessageBody: body,
            DelaySeconds: delaySeconds,
            MessageGroupId: messageGroupId,
            MessageDeduplicationId: messageDeduplicationId,
          })
        );
        return {
          content: [{ type: "text", text: `Message sent. MessageId: ${result.MessageId}` }],
        };
      } catch (error) {
        return toMcpError(error);
      }
    }
  );

  server.tool(
    "sqs_receive_messages",
    "Receive messages from an SQS queue in LocalStack",
    {
      queueName: z.string().min(1).describe("Queue name"),
      maxMessages: z.number().int().min(1).max(10).optional().describe("Maximum number of messages to receive (1-10, default: 1)"),
      waitTimeSeconds: z.number().int().min(0).max(20).optional().describe("Long-polling wait time in seconds (0-20, default: 0)"),
      visibilityTimeout: z.number().int().min(0).max(43200).optional().describe("Visibility timeout in seconds for received messages"),
    },
    async ({ queueName, maxMessages, waitTimeSeconds, visibilityTimeout }) => {
      try {
        const { QueueUrl } = await sqsClient.send(
          new GetQueueUrlCommand({ QueueName: queueName })
        );
        const result = await sqsClient.send(
          new ReceiveMessageCommand({
            QueueUrl,
            MaxNumberOfMessages: maxMessages ?? 1,
            WaitTimeSeconds: waitTimeSeconds ?? 0,
            VisibilityTimeout: visibilityTimeout,
          })
        );
        const messages = (result.Messages ?? []).map((m) => ({
          messageId: m.MessageId,
          body: m.Body,
          receiptHandle: m.ReceiptHandle,
          attributes: m.Attributes,
        }));
        return {
          content: [{ type: "text", text: JSON.stringify(messages, null, 2) }],
        };
      } catch (error) {
        return toMcpError(error);
      }
    }
  );

  server.tool(
    "sqs_delete_message",
    "Delete a message from an SQS queue using its receipt handle",
    {
      queueName: z.string().min(1).describe("Queue name"),
      receiptHandle: z.string().min(1).describe("Receipt handle returned when the message was received"),
    },
    async ({ queueName, receiptHandle }) => {
      try {
        const { QueueUrl } = await sqsClient.send(
          new GetQueueUrlCommand({ QueueName: queueName })
        );
        await sqsClient.send(
          new DeleteMessageCommand({ QueueUrl, ReceiptHandle: receiptHandle })
        );
        return {
          content: [{ type: "text", text: `Message deleted from queue '${queueName}'.` }],
        };
      } catch (error) {
        return toMcpError(error);
      }
    }
  );

  server.tool(
    "sqs_purge_queue",
    "Purge all messages from an SQS queue in LocalStack",
    {
      queueName: z.string().min(1).describe("Queue name"),
    },
    async ({ queueName }) => {
      try {
        const { QueueUrl } = await sqsClient.send(
          new GetQueueUrlCommand({ QueueName: queueName })
        );
        await sqsClient.send(new PurgeQueueCommand({ QueueUrl }));
        return {
          content: [{ type: "text", text: `Queue '${queueName}' purged successfully.` }],
        };
      } catch (error) {
        return toMcpError(error);
      }
    }
  );
}
