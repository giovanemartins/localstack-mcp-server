import {
  CreateStreamCommand,
  DeleteStreamCommand,
  DescribeStreamCommand,
  GetRecordsCommand,
  GetShardIteratorCommand,
  KinesisClient,
  ListStreamsCommand,
  PutRecordCommand,
  PutRecordsCommand,
} from "@aws-sdk/client-kinesis";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { config } from "../src/config.js";

const client = new KinesisClient({
  endpoint: config.endpoint,
  region: config.region,
  credentials: config.credentials,
});

const STREAM_NAME = `test-stream-${Date.now()}`;

function waitForStreamActive(name: string, retries = 10): Promise<void> {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const check = async () => {
      try {
        const result = await client.send(new DescribeStreamCommand({ StreamName: name }));
        if (result.StreamDescription?.StreamStatus === "ACTIVE") {
          resolve();
        } else if (attempts++ < retries) {
          setTimeout(check, 500);
        } else {
          reject(new Error("Stream never became ACTIVE"));
        }
      } catch {
        if (attempts++ < retries) setTimeout(check, 500);
        else reject(new Error("Stream describe failed"));
      }
    };
    check();
  });
}

beforeAll(async () => {
  await client.send(new CreateStreamCommand({ StreamName: STREAM_NAME, ShardCount: 1 }));
  await waitForStreamActive(STREAM_NAME);
});

afterAll(async () => {
  await client.send(new DeleteStreamCommand({ StreamName: STREAM_NAME }));
});

describe("Kinesis — list streams", () => {
  it("returns the test stream in the list", async () => {
    const result = await client.send(new ListStreamsCommand({}));
    expect(result.StreamNames ?? []).toContain(STREAM_NAME);
  });
});

describe("Kinesis — create & delete stream", () => {
  const ephemeralStream = `ephemeral-stream-${Date.now()}`;

  it("creates a stream successfully", async () => {
    await expect(
      client.send(new CreateStreamCommand({ StreamName: ephemeralStream, ShardCount: 1 }))
    ).resolves.toBeDefined();
    await waitForStreamActive(ephemeralStream);
  });

  it("deletes the stream successfully", async () => {
    await expect(
      client.send(new DeleteStreamCommand({ StreamName: ephemeralStream }))
    ).resolves.toBeDefined();
  });
});

describe("Kinesis — describe stream", () => {
  it("returns stream details", async () => {
    const result = await client.send(new DescribeStreamCommand({ StreamName: STREAM_NAME }));
    expect(result.StreamDescription?.StreamName).toBe(STREAM_NAME);
    expect(result.StreamDescription?.StreamStatus).toBe("ACTIVE");
    expect(result.StreamDescription?.Shards?.length).toBeGreaterThan(0);
  });
});

describe("Kinesis — put & get records", () => {
  let shardId: string;

  it("puts a single record", async () => {
    const result = await client.send(
      new PutRecordCommand({
        StreamName: STREAM_NAME,
        Data: Buffer.from(JSON.stringify({ hello: "kinesis" }), "utf-8"),
        PartitionKey: "test-key",
      })
    );
    expect(result.ShardId).toBeDefined();
    expect(result.SequenceNumber).toBeDefined();
    shardId = result.ShardId!;
  });

  it("puts multiple records", async () => {
    const result = await client.send(
      new PutRecordsCommand({
        StreamName: STREAM_NAME,
        Records: [
          { Data: Buffer.from("record-1", "utf-8"), PartitionKey: "key-1" },
          { Data: Buffer.from("record-2", "utf-8"), PartitionKey: "key-2" },
        ],
      })
    );
    expect(result.FailedRecordCount).toBe(0);
  });

  it("gets records from the shard", async () => {
    const iterResult = await client.send(
      new GetShardIteratorCommand({
        StreamName: STREAM_NAME,
        ShardId: shardId,
        ShardIteratorType: "TRIM_HORIZON",
      })
    );
    const records = await client.send(
      new GetRecordsCommand({ ShardIterator: iterResult.ShardIterator!, Limit: 10 })
    );
    expect((records.Records ?? []).length).toBeGreaterThan(0);
    const decoded = records.Records!.map((r) =>
      Buffer.from(r.Data!).toString("utf-8")
    );
    expect(decoded).toContain(JSON.stringify({ hello: "kinesis" }));
  });
});
