import {
  CreateStreamCommand,
  DeleteStreamCommand,
  GetRecordsCommand,
  GetShardIteratorCommand,
  ListShardsCommand,
  PutRecordsCommand,
  waitUntilStreamExists,
} from "@aws-sdk/client-kinesis";
import { kinesisClient } from "../utils/client.js";

const STREAM_NAME = "my-example-stream";

const RECORDS = [
  { partitionKey: "user-001", data: { event: "PageView", url: "/home", userId: "user-001" } },
  { partitionKey: "user-002", data: { event: "PageView", url: "/products", userId: "user-002" } },
  { partitionKey: "user-001", data: { event: "AddToCart", productId: "prod-42", userId: "user-001" } },
  { partitionKey: "user-002", data: { event: "Purchase", orderId: "ord-007", amount: 149.99, userId: "user-002" } },
];

async function createStream(): Promise<void> {
  console.log(`Creating Kinesis stream '${STREAM_NAME}'...`);

  await kinesisClient.send(
    new CreateStreamCommand({ StreamName: STREAM_NAME, ShardCount: 1 })
  );

  console.log("  Waiting for stream to become active...");
  await waitUntilStreamExists(
    { client: kinesisClient, maxWaitTime: 30 },
    { StreamName: STREAM_NAME }
  );

  console.log("  Stream is active.\n");
}

async function putRecords(): Promise<void> {
  console.log(`Putting ${RECORDS.length} records onto the stream...\n`);

  const result = await kinesisClient.send(
    new PutRecordsCommand({
      StreamName: STREAM_NAME,
      Records: RECORDS.map((r) => ({
        PartitionKey: r.partitionKey,
        Data: Buffer.from(JSON.stringify(r.data), "utf-8"),
      })),
    })
  );

  console.log(`  Successful: ${RECORDS.length - (result.FailedRecordCount ?? 0)}`);
  console.log(`  Failed:     ${result.FailedRecordCount ?? 0}\n`);
}

async function readRecords(): Promise<void> {
  console.log("Reading records from stream...\n");

  const shardsResult = await kinesisClient.send(
    new ListShardsCommand({ StreamName: STREAM_NAME })
  );

  const shardId = shardsResult.Shards?.[0]?.ShardId!;

  const iteratorResult = await kinesisClient.send(
    new GetShardIteratorCommand({
      StreamName: STREAM_NAME,
      ShardId: shardId,
      ShardIteratorType: "TRIM_HORIZON",
    })
  );

  let shardIterator = iteratorResult.ShardIterator!;
  let totalRead = 0;

  while (shardIterator) {
    const recordsResult = await kinesisClient.send(
      new GetRecordsCommand({ ShardIterator: shardIterator, Limit: 10 })
    );

    const records = recordsResult.Records ?? [];
    if (records.length === 0) break;

    for (const record of records) {
      const data = JSON.parse(Buffer.from(record.Data!).toString("utf-8"));
      console.log(`  [${data.event}]`);
      console.log(`    Partition: ${record.PartitionKey}`);
      console.log(`    Payload:   ${JSON.stringify(data)}`);
      console.log(`    SeqNo:     ${record.SequenceNumber}\n`);
      totalRead++;
    }

    shardIterator = recordsResult.NextShardIterator ?? "";
    if (!recordsResult.NextShardIterator || records.length < 10) break;
  }

  console.log(`  Total read: ${totalRead}\n`);
}

async function deleteStream(): Promise<void> {
  console.log(`Cleaning up — deleting stream '${STREAM_NAME}'...`);
  await kinesisClient.send(new DeleteStreamCommand({ StreamName: STREAM_NAME }));
  console.log("  Stream deleted.");
}

async function main(): Promise<void> {
  await createStream();
  await putRecords();
  await readRecords();
  await deleteStream();
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
