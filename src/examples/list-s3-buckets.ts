import { ListBucketsCommand } from "@aws-sdk/client-s3";
import { S3Client } from "@aws-sdk/client-s3";
import { config } from "../config.js";

const s3Client = new S3Client({
  endpoint: config.endpoint,
  region: config.region,
  credentials: config.credentials,
  forcePathStyle: true,
});

async function listBuckets(): Promise<void> {
  const result = await s3Client.send(new ListBucketsCommand({}));
  const buckets = result.Buckets ?? [];

  if (buckets.length === 0) {
    console.log("No buckets found.");
    return;
  }

  console.log(`Found ${buckets.length} bucket(s):\n`);
  buckets.forEach((bucket) => {
    console.log(`  - ${bucket.Name} (created: ${bucket.CreationDate?.toISOString()})`);
  });
}

listBuckets().catch((err) => {
  console.error("Error listing buckets:", err);
  process.exit(1);
});
