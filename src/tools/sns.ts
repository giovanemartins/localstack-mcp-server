import {
  CreateTopicCommand,
  DeleteTopicCommand,
  ListSubscriptionsByTopicCommand,
  ListTopicsCommand,
  PublishCommand,
  SubscribeCommand,
  UnsubscribeCommand,
} from "@aws-sdk/client-sns";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { snsClient } from "../utils/client.js";
import { toMcpError } from "../utils/errors.js";

export function registerSnsTools(server: McpServer): void {
  server.tool(
    "sns_list_topics",
    "List all SNS topics in LocalStack",
    {},
    async () => {
      try {
        const result = await snsClient.send(new ListTopicsCommand({}));
        const topics = (result.Topics ?? []).map((t) => t.TopicArn);
        return {
          content: [{ type: "text", text: JSON.stringify(topics, null, 2) }],
        };
      } catch (error) {
        return toMcpError(error);
      }
    }
  );

  server.tool(
    "sns_create_topic",
    "Create a new SNS topic in LocalStack",
    {
      name: z.string().min(1).describe("Topic name"),
      fifo: z.boolean().optional().describe("Create as a FIFO topic (name must end with .fifo)"),
    },
    async ({ name, fifo }) => {
      try {
        const attributes: Record<string, string> = {};
        if (fifo) attributes["FifoTopic"] = "true";
        const result = await snsClient.send(
          new CreateTopicCommand({
            Name: name,
            Attributes: Object.keys(attributes).length > 0 ? attributes : undefined,
          })
        );
        return {
          content: [{ type: "text", text: `Topic created. ARN: ${result.TopicArn}` }],
        };
      } catch (error) {
        return toMcpError(error);
      }
    }
  );

  server.tool(
    "sns_delete_topic",
    "Delete an SNS topic from LocalStack",
    {
      topicArn: z.string().min(1).describe("Topic ARN"),
    },
    async ({ topicArn }) => {
      try {
        await snsClient.send(new DeleteTopicCommand({ TopicArn: topicArn }));
        return {
          content: [{ type: "text", text: `Topic '${topicArn}' deleted successfully.` }],
        };
      } catch (error) {
        return toMcpError(error);
      }
    }
  );

  server.tool(
    "sns_subscribe",
    "Subscribe an endpoint to an SNS topic in LocalStack",
    {
      topicArn: z.string().min(1).describe("Topic ARN"),
      protocol: z.enum(["sqs", "http", "https", "email", "lambda"]).describe("Subscription protocol"),
      endpoint: z.string().min(1).describe("Endpoint to subscribe (e.g. SQS ARN, URL, email)"),
    },
    async ({ topicArn, protocol, endpoint }) => {
      try {
        const result = await snsClient.send(
          new SubscribeCommand({ TopicArn: topicArn, Protocol: protocol, Endpoint: endpoint })
        );
        return {
          content: [{ type: "text", text: `Subscribed. SubscriptionArn: ${result.SubscriptionArn}` }],
        };
      } catch (error) {
        return toMcpError(error);
      }
    }
  );

  server.tool(
    "sns_unsubscribe",
    "Unsubscribe an endpoint from an SNS topic in LocalStack",
    {
      subscriptionArn: z.string().min(1).describe("Subscription ARN"),
    },
    async ({ subscriptionArn }) => {
      try {
        await snsClient.send(new UnsubscribeCommand({ SubscriptionArn: subscriptionArn }));
        return {
          content: [{ type: "text", text: `Unsubscribed: ${subscriptionArn}` }],
        };
      } catch (error) {
        return toMcpError(error);
      }
    }
  );

  server.tool(
    "sns_list_subscriptions_by_topic",
    "List all subscriptions for an SNS topic in LocalStack",
    {
      topicArn: z.string().min(1).describe("Topic ARN"),
    },
    async ({ topicArn }) => {
      try {
        const result = await snsClient.send(
          new ListSubscriptionsByTopicCommand({ TopicArn: topicArn })
        );
        const subs = (result.Subscriptions ?? []).map((s) => ({
          subscriptionArn: s.SubscriptionArn,
          protocol: s.Protocol,
          endpoint: s.Endpoint,
        }));
        return {
          content: [{ type: "text", text: JSON.stringify(subs, null, 2) }],
        };
      } catch (error) {
        return toMcpError(error);
      }
    }
  );

  server.tool(
    "sns_publish",
    "Publish a message to an SNS topic in LocalStack",
    {
      topicArn: z.string().min(1).describe("Topic ARN"),
      message: z.string().min(1).describe("Message body"),
      subject: z.string().optional().describe("Message subject (used for email subscriptions)"),
    },
    async ({ topicArn, message, subject }) => {
      try {
        const result = await snsClient.send(
          new PublishCommand({ TopicArn: topicArn, Message: message, Subject: subject })
        );
        return {
          content: [{ type: "text", text: `Message published. MessageId: ${result.MessageId}` }],
        };
      } catch (error) {
        return toMcpError(error);
      }
    }
  );
}
