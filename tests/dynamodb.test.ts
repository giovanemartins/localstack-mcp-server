import {
  CreateTableCommand,
  DeleteTableCommand,
  DescribeTableCommand,
  DynamoDBClient,
  KeyType,
  ListTablesCommand,
} from "@aws-sdk/client-dynamodb";
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { config } from "../src/config.js";

const rawClient = new DynamoDBClient({
  endpoint: config.endpoint,
  region: config.region,
  credentials: config.credentials,
});
const client = DynamoDBDocumentClient.from(rawClient);

const TABLE_NAME = `test-table-${Date.now()}`;

beforeAll(async () => {
  await rawClient.send(
    new CreateTableCommand({
      TableName: TABLE_NAME,
      KeySchema: [
        { AttributeName: "pk", KeyType: KeyType.HASH },
        { AttributeName: "sk", KeyType: KeyType.RANGE },
      ],
      AttributeDefinitions: [
        { AttributeName: "pk", AttributeType: "S" },
        { AttributeName: "sk", AttributeType: "S" },
      ],
      BillingMode: "PAY_PER_REQUEST",
    })
  );
  const wait = async (retries = 10): Promise<void> => {
    const result = await rawClient.send(new DescribeTableCommand({ TableName: TABLE_NAME }));
    if (result.Table?.TableStatus === "ACTIVE") return;
    if (retries > 0) { await new Promise((r) => setTimeout(r, 300)); return wait(retries - 1); }
  };
  await wait();
});

afterAll(async () => {
  await rawClient.send(new DeleteTableCommand({ TableName: TABLE_NAME }));
});

describe("DynamoDB — list tables", () => {
  it("returns the test table in the list", async () => {
    const result = await rawClient.send(new ListTablesCommand({}));
    expect(result.TableNames ?? []).toContain(TABLE_NAME);
  });
});

describe("DynamoDB — create & delete table", () => {
  const ephemeralTable = `ephemeral-table-${Date.now()}`;

  it("creates a table successfully", async () => {
    await expect(
      rawClient.send(
        new CreateTableCommand({
          TableName: ephemeralTable,
          KeySchema: [{ AttributeName: "id", KeyType: KeyType.HASH }],
          AttributeDefinitions: [{ AttributeName: "id", AttributeType: "S" }],
          BillingMode: "PAY_PER_REQUEST",
        })
      )
    ).resolves.toBeDefined();
  });

  it("deletes the table successfully", async () => {
    await expect(
      rawClient.send(new DeleteTableCommand({ TableName: ephemeralTable }))
    ).resolves.toBeDefined();
  });
});

describe("DynamoDB — put & get item", () => {
  const item = { pk: "user#1", sk: "profile", name: "Alice", age: 30 };

  it("puts an item successfully", async () => {
    await expect(
      client.send(new PutCommand({ TableName: TABLE_NAME, Item: item }))
    ).resolves.toBeDefined();
  });

  it("gets the item by key", async () => {
    const result = await client.send(
      new GetCommand({ TableName: TABLE_NAME, Key: { pk: "user#1", sk: "profile" } })
    );
    expect(result.Item).toMatchObject(item);
  });
});

describe("DynamoDB — scan", () => {
  it("scans all items and finds the test item", async () => {
    const result = await client.send(new ScanCommand({ TableName: TABLE_NAME }));
    expect((result.Items ?? []).length).toBeGreaterThan(0);
    expect(result.Items?.some((i) => i.pk === "user#1")).toBe(true);
  });
});

describe("DynamoDB — query", () => {
  it("queries by partition key", async () => {
    const result = await client.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: "pk = :pk",
        ExpressionAttributeValues: { ":pk": "user#1" },
      })
    );
    expect(result.Count).toBeGreaterThan(0);
    expect(result.Items?.[0].name).toBe("Alice");
  });
});

describe("DynamoDB — delete item", () => {
  it("deletes an item by key", async () => {
    await expect(
      client.send(
        new DeleteCommand({ TableName: TABLE_NAME, Key: { pk: "user#1", sk: "profile" } })
      )
    ).resolves.toBeDefined();
  });

  it("item is gone after deletion", async () => {
    const result = await client.send(
      new GetCommand({ TableName: TABLE_NAME, Key: { pk: "user#1", sk: "profile" } })
    );
    expect(result.Item).toBeUndefined();
  });
});
