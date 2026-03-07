import {
  CreateEventBusCommand,
  DeleteEventBusCommand,
  DeleteRuleCommand,
  DescribeRuleCommand,
  DisableRuleCommand,
  EnableRuleCommand,
  ListEventBusesCommand,
  ListRulesCommand,
  ListTargetsByRuleCommand,
  PutEventsCommand,
  PutRuleCommand,
  PutTargetsCommand,
  RemoveTargetsCommand,
} from "@aws-sdk/client-eventbridge";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { eventBridgeClient } from "../utils/client.js";
import { toMcpError } from "../utils/errors.js";

export function registerEventBridgeTools(server: McpServer): void {
  server.tool(
    "eventbridge_list_buses",
    "List all EventBridge event buses in LocalStack",
    {
      prefix: z.string().optional().describe("Filter buses by name prefix"),
    },
    async ({ prefix }) => {
      try {
        const result = await eventBridgeClient.send(
          new ListEventBusesCommand({ NamePrefix: prefix })
        );
        const buses = (result.EventBuses ?? []).map((b) => ({
          name: b.Name,
          arn: b.Arn,
        }));
        return {
          content: [{ type: "text", text: JSON.stringify(buses, null, 2) }],
        };
      } catch (error) {
        return toMcpError(error);
      }
    }
  );

  server.tool(
    "eventbridge_create_bus",
    "Create a new EventBridge event bus in LocalStack",
    {
      name: z.string().min(1).describe("Event bus name"),
    },
    async ({ name }) => {
      try {
        const result = await eventBridgeClient.send(
          new CreateEventBusCommand({ Name: name })
        );
        return {
          content: [{ type: "text", text: `Event bus created. ARN: ${result.EventBusArn}` }],
        };
      } catch (error) {
        return toMcpError(error);
      }
    }
  );

  server.tool(
    "eventbridge_delete_bus",
    "Delete an EventBridge event bus from LocalStack",
    {
      name: z.string().min(1).describe("Event bus name"),
    },
    async ({ name }) => {
      try {
        await eventBridgeClient.send(new DeleteEventBusCommand({ Name: name }));
        return {
          content: [{ type: "text", text: `Event bus '${name}' deleted successfully.` }],
        };
      } catch (error) {
        return toMcpError(error);
      }
    }
  );

  server.tool(
    "eventbridge_list_rules",
    "List EventBridge rules in LocalStack",
    {
      eventBusName: z.string().optional().describe("Event bus name (default: default)"),
      prefix: z.string().optional().describe("Filter rules by name prefix"),
    },
    async ({ eventBusName, prefix }) => {
      try {
        const result = await eventBridgeClient.send(
          new ListRulesCommand({ EventBusName: eventBusName, NamePrefix: prefix })
        );
        const rules = (result.Rules ?? []).map((r) => ({
          name: r.Name,
          arn: r.Arn,
          state: r.State,
          scheduleExpression: r.ScheduleExpression,
          eventPattern: r.EventPattern,
        }));
        return {
          content: [{ type: "text", text: JSON.stringify(rules, null, 2) }],
        };
      } catch (error) {
        return toMcpError(error);
      }
    }
  );

  server.tool(
    "eventbridge_put_rule",
    "Create or update an EventBridge rule in LocalStack",
    {
      name: z.string().min(1).describe("Rule name"),
      eventBusName: z.string().optional().describe("Event bus name (default: default)"),
      eventPattern: z.string().optional().describe("Event pattern as JSON string"),
      scheduleExpression: z.string().optional().describe("Schedule expression (e.g. rate(5 minutes))"),
      description: z.string().optional().describe("Rule description"),
      state: z.enum(["ENABLED", "DISABLED"]).optional().describe("Rule state (default: ENABLED)"),
    },
    async ({ name, eventBusName, eventPattern, scheduleExpression, description, state }) => {
      try {
        const result = await eventBridgeClient.send(
          new PutRuleCommand({
            Name: name,
            EventBusName: eventBusName,
            EventPattern: eventPattern,
            ScheduleExpression: scheduleExpression,
            Description: description,
            State: state ?? "ENABLED",
          })
        );
        return {
          content: [{ type: "text", text: `Rule created/updated. ARN: ${result.RuleArn}` }],
        };
      } catch (error) {
        return toMcpError(error);
      }
    }
  );

  server.tool(
    "eventbridge_delete_rule",
    "Delete an EventBridge rule from LocalStack",
    {
      name: z.string().min(1).describe("Rule name"),
      eventBusName: z.string().optional().describe("Event bus name (default: default)"),
    },
    async ({ name, eventBusName }) => {
      try {
        await eventBridgeClient.send(
          new DeleteRuleCommand({ Name: name, EventBusName: eventBusName })
        );
        return {
          content: [{ type: "text", text: `Rule '${name}' deleted successfully.` }],
        };
      } catch (error) {
        return toMcpError(error);
      }
    }
  );

  server.tool(
    "eventbridge_describe_rule",
    "Describe an EventBridge rule in LocalStack",
    {
      name: z.string().min(1).describe("Rule name"),
      eventBusName: z.string().optional().describe("Event bus name (default: default)"),
    },
    async ({ name, eventBusName }) => {
      try {
        const result = await eventBridgeClient.send(
          new DescribeRuleCommand({ Name: name, EventBusName: eventBusName })
        );
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        return toMcpError(error);
      }
    }
  );

  server.tool(
    "eventbridge_enable_rule",
    "Enable an EventBridge rule in LocalStack",
    {
      name: z.string().min(1).describe("Rule name"),
      eventBusName: z.string().optional().describe("Event bus name (default: default)"),
    },
    async ({ name, eventBusName }) => {
      try {
        await eventBridgeClient.send(
          new EnableRuleCommand({ Name: name, EventBusName: eventBusName })
        );
        return {
          content: [{ type: "text", text: `Rule '${name}' enabled.` }],
        };
      } catch (error) {
        return toMcpError(error);
      }
    }
  );

  server.tool(
    "eventbridge_disable_rule",
    "Disable an EventBridge rule in LocalStack",
    {
      name: z.string().min(1).describe("Rule name"),
      eventBusName: z.string().optional().describe("Event bus name (default: default)"),
    },
    async ({ name, eventBusName }) => {
      try {
        await eventBridgeClient.send(
          new DisableRuleCommand({ Name: name, EventBusName: eventBusName })
        );
        return {
          content: [{ type: "text", text: `Rule '${name}' disabled.` }],
        };
      } catch (error) {
        return toMcpError(error);
      }
    }
  );

  server.tool(
    "eventbridge_put_targets",
    "Add or update targets for an EventBridge rule in LocalStack",
    {
      rule: z.string().min(1).describe("Rule name"),
      eventBusName: z.string().optional().describe("Event bus name (default: default)"),
      targets: z
        .array(
          z.object({
            id: z.string().min(1).describe("Unique target ID"),
            arn: z.string().min(1).describe("Target ARN (e.g. SQS queue ARN, Lambda ARN)"),
          })
        )
        .min(1)
        .describe("List of targets"),
    },
    async ({ rule, eventBusName, targets }) => {
      try {
        const result = await eventBridgeClient.send(
          new PutTargetsCommand({
            Rule: rule,
            EventBusName: eventBusName,
            Targets: targets.map((t) => ({ Id: t.id, Arn: t.arn })),
          })
        );
        return {
          content: [
            {
              type: "text",
              text: `Targets added. Failed entries: ${result.FailedEntryCount ?? 0}`,
            },
          ],
        };
      } catch (error) {
        return toMcpError(error);
      }
    }
  );

  server.tool(
    "eventbridge_list_targets",
    "List targets for an EventBridge rule in LocalStack",
    {
      rule: z.string().min(1).describe("Rule name"),
      eventBusName: z.string().optional().describe("Event bus name (default: default)"),
    },
    async ({ rule, eventBusName }) => {
      try {
        const result = await eventBridgeClient.send(
          new ListTargetsByRuleCommand({ Rule: rule, EventBusName: eventBusName })
        );
        const targets = (result.Targets ?? []).map((t) => ({
          id: t.Id,
          arn: t.Arn,
        }));
        return {
          content: [{ type: "text", text: JSON.stringify(targets, null, 2) }],
        };
      } catch (error) {
        return toMcpError(error);
      }
    }
  );

  server.tool(
    "eventbridge_remove_targets",
    "Remove targets from an EventBridge rule in LocalStack",
    {
      rule: z.string().min(1).describe("Rule name"),
      eventBusName: z.string().optional().describe("Event bus name (default: default)"),
      ids: z.array(z.string().min(1)).min(1).describe("List of target IDs to remove"),
    },
    async ({ rule, eventBusName, ids }) => {
      try {
        const result = await eventBridgeClient.send(
          new RemoveTargetsCommand({ Rule: rule, EventBusName: eventBusName, Ids: ids })
        );
        return {
          content: [
            {
              type: "text",
              text: `Targets removed. Failed entries: ${result.FailedEntryCount ?? 0}`,
            },
          ],
        };
      } catch (error) {
        return toMcpError(error);
      }
    }
  );

  server.tool(
    "eventbridge_put_events",
    "Put custom events onto an EventBridge event bus in LocalStack",
    {
      entries: z
        .array(
          z.object({
            source: z.string().min(1).describe("Event source (e.g. myapp.orders)"),
            detailType: z.string().min(1).describe("Free-form event type string"),
            detail: z.string().describe("Event detail as a JSON string"),
            eventBusName: z.string().optional().describe("Target event bus name"),
          })
        )
        .min(1)
        .max(10)
        .describe("Events to put (max 10)"),
    },
    async ({ entries }) => {
      try {
        const result = await eventBridgeClient.send(
          new PutEventsCommand({
            Entries: entries.map((e) => ({
              Source: e.source,
              DetailType: e.detailType,
              Detail: e.detail,
              EventBusName: e.eventBusName,
            })),
          })
        );
        return {
          content: [
            {
              type: "text",
              text: `Events sent. Failed entries: ${result.FailedEntryCount ?? 0}`,
            },
          ],
        };
      } catch (error) {
        return toMcpError(error);
      }
    }
  );
}
