import {
  CreateBucketCommand,
  DeleteBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  ListBucketsCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { config } from "../src/config.js";

const client = new S3Client({
  endpoint: config.endpoint,
  region: config.region,
  credentials: config.credentials,
  forcePathStyle: true,
});

const TEST_BUCKET = `test-bucket-${Date.now()}`;

beforeAll(async () => {
  await client.send(new CreateBucketCommand({ Bucket: TEST_BUCKET }));
});

afterAll(async () => {
  const listed = await client.send(
    new ListObjectsV2Command({ Bucket: TEST_BUCKET })
  );
  for (const obj of listed.Contents ?? []) {
    await client.send(
      new DeleteObjectCommand({ Bucket: TEST_BUCKET, Key: obj.Key! })
    );
  }
  await client.send(new DeleteBucketCommand({ Bucket: TEST_BUCKET }));
});

describe("S3 — list buckets", () => {
  it("returns the test bucket in the list", async () => {
    const result = await client.send(new ListBucketsCommand({}));
    const names = (result.Buckets ?? []).map((b) => b.Name);
    expect(names).toContain(TEST_BUCKET);
  });
});

describe("S3 — create & delete bucket", () => {
  const ephemeralBucket = `ephemeral-${Date.now()}`;

  it("creates a bucket successfully", async () => {
    await expect(
      client.send(new CreateBucketCommand({ Bucket: ephemeralBucket }))
    ).resolves.toBeDefined();
  });

  it("deletes the bucket successfully", async () => {
    await expect(
      client.send(new DeleteBucketCommand({ Bucket: ephemeralBucket }))
    ).resolves.toBeDefined();
  });
});

describe("S3 — put & get object", () => {
  const key = "hello/world.txt";
  const body = "Hello, LocalStack!";

  it("uploads an object", async () => {
    await expect(
      client.send(
        new PutObjectCommand({
          Bucket: TEST_BUCKET,
          Key: key,
          Body: body,
          ContentType: "text/plain",
        })
      )
    ).resolves.toBeDefined();
  });

  it("downloads the object and matches content", async () => {
    const result = await client.send(
      new GetObjectCommand({ Bucket: TEST_BUCKET, Key: key })
    );
    const text = await result.Body?.transformToString();
    expect(text).toBe(body);
  });
});

describe("S3 — list objects", () => {
  it("lists objects with a prefix", async () => {
    const result = await client.send(
      new ListObjectsV2Command({ Bucket: TEST_BUCKET, Prefix: "hello/" })
    );
    const keys = (result.Contents ?? []).map((o) => o.Key);
    expect(keys).toContain("hello/world.txt");
  });

  it("returns empty array for non-matching prefix", async () => {
    const result = await client.send(
      new ListObjectsV2Command({ Bucket: TEST_BUCKET, Prefix: "nonexistent/" })
    );
    expect(result.Contents ?? []).toHaveLength(0);
  });
});

describe("S3 — delete object", () => {
  it("deletes an object successfully", async () => {
    await expect(
      client.send(
        new DeleteObjectCommand({ Bucket: TEST_BUCKET, Key: "hello/world.txt" })
      )
    ).resolves.toBeDefined();
  });

  it("object is gone after deletion", async () => {
    const result = await client.send(
      new ListObjectsV2Command({ Bucket: TEST_BUCKET, Prefix: "hello/" })
    );
    expect(result.Contents ?? []).toHaveLength(0);
  });
});
