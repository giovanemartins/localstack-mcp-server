import {
  CreateTableCommand,
  DeleteTableCommand,
  waitUntilTableExists,
} from "@aws-sdk/client-dynamodb";
import {
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { dynamoClient, dynamoRawClient } from "../utils/client.js";

const TABLE_NAME = "Orders";

const ITEMS = [
  { orderId: "ord-001", customerId: "cust-A", product: "Laptop", amount: 1299.99, status: "pending" },
  { orderId: "ord-002", customerId: "cust-A", product: "Mouse", amount: 29.99, status: "shipped" },
  { orderId: "ord-003", customerId: "cust-B", product: "Keyboard", amount: 79.99, status: "pending" },
];

async function createTable(): Promise<void> {
  console.log(`Creating table '${TABLE_NAME}'...`);

  await dynamoRawClient.send(
    new CreateTableCommand({
      TableName: TABLE_NAME,
      KeySchema: [
        { AttributeName: "customerId", KeyType: "HASH" },
        { AttributeName: "orderId", KeyType: "RANGE" },
      ],
      AttributeDefinitions: [
        { AttributeName: "customerId", AttributeType: "S" },
        { AttributeName: "orderId", AttributeType: "S" },
      ],
      BillingMode: "PAY_PER_REQUEST",
    })
  );

  console.log("  Waiting for table to become active...");
  await waitUntilTableExists(
    { client: dynamoRawClient, maxWaitTime: 30 },
    { TableName: TABLE_NAME }
  );

  console.log("  Table is active.\n");
}

async function putItems(): Promise<void> {
  console.log(`Inserting ${ITEMS.length} items...\n`);

  for (const item of ITEMS) {
    await dynamoClient.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
    console.log(`  [PUT] ${item.orderId} — ${item.product} ($${item.amount})`);
  }

  console.log();
}

async function getItem(): Promise<void> {
  const key = { customerId: "cust-A", orderId: "ord-001" };
  console.log(`Getting item ${JSON.stringify(key)}...`);

  const result = await dynamoClient.send(new GetCommand({ TableName: TABLE_NAME, Key: key }));

  console.log("  Item:", JSON.stringify(result.Item, null, 2), "\n");
}

async function queryItems(): Promise<void> {
  console.log("Querying all orders for 'cust-A'...\n");

  const result = await dynamoClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "customerId = :cid",
      ExpressionAttributeValues: { ":cid": "cust-A" },
    })
  );

  for (const item of result.Items ?? []) {
    console.log(`  [${item.orderId}] ${item.product} — $${item.amount} (${item.status})`);
  }

  console.log();
}

async function updateItem(): Promise<void> {
  const key = { customerId: "cust-A", orderId: "ord-001" };
  console.log(`Updating status of ${key.orderId} to 'shipped'...`);

  const result = await dynamoClient.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: key,
      UpdateExpression: "SET #s = :newStatus",
      ExpressionAttributeNames: { "#s": "status" },
      ExpressionAttributeValues: { ":newStatus": "shipped" },
      ReturnValues: "ALL_NEW",
    })
  );

  console.log("  Updated item:", JSON.stringify(result.Attributes, null, 2), "\n");
}

async function deleteItems(): Promise<void> {
  console.log("Deleting all items...");

  for (const item of ITEMS) {
    await dynamoClient.send(
      new DeleteCommand({ TableName: TABLE_NAME, Key: { customerId: item.customerId, orderId: item.orderId } })
    );
    console.log(`  [DELETED] ${item.orderId}`);
  }

  console.log();
}

async function deleteTable(): Promise<void> {
  console.log(`Deleting table '${TABLE_NAME}'...`);
  await dynamoRawClient.send(new DeleteTableCommand({ TableName: TABLE_NAME }));
  console.log("  Table deleted.");
}

async function main(): Promise<void> {
  await createTable();
  await putItems();
  await getItem();
  await queryItems();
  await updateItem();
  await deleteItems();
  await deleteTable();
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
