import {
  CreateTableCommand,
  DeleteTableCommand,
  DescribeTableCommand,
  KeyType,
  ListTablesCommand,
} from "@aws-sdk/client-dynamodb";
import {
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { dynamoClient, dynamoRawClient } from "../utils/client.js";
import { toMcpError } from "../utils/errors.js";

export function registerDynamoDBTools(server: McpServer): void {
  server.tool(
    "dynamodb_list_tables",
    "List all DynamoDB tables in LocalStack",
    {},
    async () => {
      try {
        const result = await dynamoRawClient.send(new ListTablesCommand({}));
        return {
          content: [{ type: "text", text: JSON.stringify(result.TableNames ?? [], null, 2) }],
        };
      } catch (error) {
        return toMcpError(error);
      }
    }
  );

  server.tool(
    "dynamodb_create_table",
    "Create a new DynamoDB table in LocalStack",
    {
      tableName: z.string().min(1).describe("Table name"),
      partitionKey: z.string().min(1).describe("Partition key attribute name"),
      partitionKeyType: z.enum(["S", "N", "B"]).describe("Partition key type: S (String), N (Number), B (Binary)"),
      sortKey: z.string().optional().describe("Sort key attribute name"),
      sortKeyType: z.enum(["S", "N", "B"]).optional().describe("Sort key type"),
      billingMode: z.enum(["PAY_PER_REQUEST", "PROVISIONED"]).optional().describe("Billing mode (default: PAY_PER_REQUEST)"),
    },
    async ({ tableName, partitionKey, partitionKeyType, sortKey, sortKeyType, billingMode }) => {
      try {
        const keySchema: Array<{ AttributeName: string; KeyType: KeyType }> = [
          { AttributeName: partitionKey, KeyType: KeyType.HASH },
        ];
        const attributeDefinitions = [{ AttributeName: partitionKey, AttributeType: partitionKeyType }];

        if (sortKey && sortKeyType) {
          keySchema.push({ AttributeName: sortKey, KeyType: KeyType.RANGE });
          attributeDefinitions.push({ AttributeName: sortKey, AttributeType: sortKeyType });
        }

        const result = await dynamoRawClient.send(
          new CreateTableCommand({
            TableName: tableName,
            KeySchema: keySchema,
            AttributeDefinitions: attributeDefinitions,
            BillingMode: billingMode ?? "PAY_PER_REQUEST",
          })
        );
        return {
          content: [
            {
              type: "text",
              text: `Table '${tableName}' created. Status: ${result.TableDescription?.TableStatus}`,
            },
          ],
        };
      } catch (error) {
        return toMcpError(error);
      }
    }
  );

  server.tool(
    "dynamodb_delete_table",
    "Delete a DynamoDB table from LocalStack",
    {
      tableName: z.string().min(1).describe("Table name"),
    },
    async ({ tableName }) => {
      try {
        await dynamoRawClient.send(new DeleteTableCommand({ TableName: tableName }));
        return {
          content: [{ type: "text", text: `Table '${tableName}' deleted successfully.` }],
        };
      } catch (error) {
        return toMcpError(error);
      }
    }
  );

  server.tool(
    "dynamodb_describe_table",
    "Describe a DynamoDB table in LocalStack",
    {
      tableName: z.string().min(1).describe("Table name"),
    },
    async ({ tableName }) => {
      try {
        const result = await dynamoRawClient.send(new DescribeTableCommand({ TableName: tableName }));
        const t = result.Table;
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  tableName: t?.TableName,
                  status: t?.TableStatus,
                  itemCount: t?.ItemCount,
                  keySchema: t?.KeySchema,
                  attributeDefinitions: t?.AttributeDefinitions,
                  billingMode: t?.BillingModeSummary?.BillingMode,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        return toMcpError(error);
      }
    }
  );

  server.tool(
    "dynamodb_put_item",
    "Put (create or replace) an item in a DynamoDB table in LocalStack",
    {
      tableName: z.string().min(1).describe("Table name"),
      item: z.string().min(1).describe("Item as a JSON string"),
    },
    async ({ tableName, item }) => {
      try {
        const parsed = JSON.parse(item) as Record<string, unknown>;
        await dynamoClient.send(new PutCommand({ TableName: tableName, Item: parsed }));
        return {
          content: [{ type: "text", text: `Item put into table '${tableName}'.` }],
        };
      } catch (error) {
        return toMcpError(error);
      }
    }
  );

  server.tool(
    "dynamodb_get_item",
    "Get an item from a DynamoDB table by its key in LocalStack",
    {
      tableName: z.string().min(1).describe("Table name"),
      key: z.string().min(1).describe("Key as a JSON string (e.g. {\"pk\": \"123\"})"),
    },
    async ({ tableName, key }) => {
      try {
        const parsed = JSON.parse(key) as Record<string, unknown>;
        const result = await dynamoClient.send(new GetCommand({ TableName: tableName, Key: parsed }));
        return {
          content: [{ type: "text", text: JSON.stringify(result.Item ?? null, null, 2) }],
        };
      } catch (error) {
        return toMcpError(error);
      }
    }
  );

  server.tool(
    "dynamodb_delete_item",
    "Delete an item from a DynamoDB table by its key in LocalStack",
    {
      tableName: z.string().min(1).describe("Table name"),
      key: z.string().min(1).describe("Key as a JSON string"),
    },
    async ({ tableName, key }) => {
      try {
        const parsed = JSON.parse(key) as Record<string, unknown>;
        await dynamoClient.send(new DeleteCommand({ TableName: tableName, Key: parsed }));
        return {
          content: [{ type: "text", text: `Item deleted from table '${tableName}'.` }],
        };
      } catch (error) {
        return toMcpError(error);
      }
    }
  );

  server.tool(
    "dynamodb_scan",
    "Scan all items in a DynamoDB table in LocalStack",
    {
      tableName: z.string().min(1).describe("Table name"),
      limit: z.number().int().min(1).optional().describe("Maximum number of items to return (default: 100)"),
      filterExpression: z.string().optional().describe("DynamoDB filter expression"),
      expressionAttributeValues: z.string().optional().describe("Expression attribute values as JSON string"),
    },
    async ({ tableName, limit, filterExpression, expressionAttributeValues }) => {
      try {
        const exprValues = expressionAttributeValues
          ? (JSON.parse(expressionAttributeValues) as Record<string, unknown>)
          : undefined;

        const result = await dynamoClient.send(
          new ScanCommand({
            TableName: tableName,
            Limit: limit ?? 100,
            FilterExpression: filterExpression,
            ExpressionAttributeValues: exprValues,
          })
        );
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ count: result.Count, items: result.Items ?? [] }, null, 2),
            },
          ],
        };
      } catch (error) {
        return toMcpError(error);
      }
    }
  );

  server.tool(
    "dynamodb_query",
    "Query items in a DynamoDB table by key condition in LocalStack",
    {
      tableName: z.string().min(1).describe("Table name"),
      keyConditionExpression: z.string().min(1).describe("Key condition expression (e.g. pk = :pk)"),
      expressionAttributeValues: z.string().min(1).describe("Expression attribute values as JSON string (e.g. {\":pk\": \"123\"})"),
      filterExpression: z.string().optional().describe("Additional filter expression"),
      limit: z.number().int().min(1).optional().describe("Maximum number of items to return"),
    },
    async ({ tableName, keyConditionExpression, expressionAttributeValues, filterExpression, limit }) => {
      try {
        const exprValues = JSON.parse(expressionAttributeValues) as Record<string, unknown>;
        const result = await dynamoClient.send(
          new QueryCommand({
            TableName: tableName,
            KeyConditionExpression: keyConditionExpression,
            ExpressionAttributeValues: exprValues,
            FilterExpression: filterExpression,
            Limit: limit,
          })
        );
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ count: result.Count, items: result.Items ?? [] }, null, 2),
            },
          ],
        };
      } catch (error) {
        return toMcpError(error);
      }
    }
  );
}
