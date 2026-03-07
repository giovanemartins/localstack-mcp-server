import {
  CreateBucketCommand,
  DeleteBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { s3Client } from "../utils/client.js";

const BUCKET_NAME = "my-example-bucket";

const OBJECTS = [
  { key: "configs/app.json", body: JSON.stringify({ env: "production", debug: false }, null, 2), contentType: "application/json" },
  { key: "logs/2026-03-07.log", body: "INFO  App started\nINFO  Listening on port 3000\nWARN  High memory usage detected", contentType: "text/plain" },
  { key: "data/users.csv", body: "id,name,email\n1,Alice,alice@example.com\n2,Bob,bob@example.com", contentType: "text/csv" },
];

async function createBucket(): Promise<void> {
  console.log(`Creating bucket '${BUCKET_NAME}'...`);
  await s3Client.send(new CreateBucketCommand({ Bucket: BUCKET_NAME }));
  console.log("  Bucket created.\n");
}

async function uploadObjects(): Promise<void> {
  console.log(`Uploading ${OBJECTS.length} objects...\n`);

  for (const obj of OBJECTS) {
    await s3Client.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: obj.key,
        Body: obj.body,
        ContentType: obj.contentType,
      })
    );
    console.log(`  [UPLOADED] ${obj.key} (${obj.contentType})`);
  }

  console.log();
}

async function listObjects(): Promise<void> {
  console.log(`Listing objects in '${BUCKET_NAME}'...\n`);

  const result = await s3Client.send(
    new ListObjectsV2Command({ Bucket: BUCKET_NAME })
  );

  for (const obj of result.Contents ?? []) {
    console.log(`  ${obj.Key}  (${obj.Size} bytes, last modified: ${obj.LastModified?.toISOString()})`);
  }

  console.log();
}

async function downloadObject(key: string): Promise<void> {
  console.log(`Downloading '${key}'...\n`);

  const result = await s3Client.send(
    new GetObjectCommand({ Bucket: BUCKET_NAME, Key: key })
  );

  const content = await result.Body?.transformToString();
  console.log("  Content:");
  console.log(content?.split("\n").map((line) => `    ${line}`).join("\n"));
  console.log();
}

async function cleanup(): Promise<void> {
  console.log("Cleaning up — deleting objects and bucket...");

  for (const obj of OBJECTS) {
    await s3Client.send(new DeleteObjectCommand({ Bucket: BUCKET_NAME, Key: obj.key }));
    console.log(`  [DELETED] ${obj.key}`);
  }

  await s3Client.send(new DeleteBucketCommand({ Bucket: BUCKET_NAME }));
  console.log(`  Bucket '${BUCKET_NAME}' deleted.`);
}

async function main(): Promise<void> {
  await createBucket();
  await uploadObjects();
  await listObjects();
  await downloadObject("configs/app.json");
  await downloadObject("data/users.csv");
  await cleanup();
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
