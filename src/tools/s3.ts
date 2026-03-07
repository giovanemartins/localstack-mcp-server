import {
  CreateBucketCommand,
  DeleteBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  ListBucketsCommand,
  ListObjectsV2Command,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { s3Client } from "../utils/client.js";
import { toMcpError } from "../utils/errors.js";

export function registerS3Tools(server: McpServer): void {
  server.tool(
    "s3_list_buckets",
    "List all S3 buckets in LocalStack",
    {},
    async () => {
      try {
        const result = await s3Client.send(new ListBucketsCommand({}));
        const buckets = (result.Buckets ?? []).map((b) => ({
          name: b.Name,
          createdAt: b.CreationDate?.toISOString(),
        }));
        return {
          content: [{ type: "text", text: JSON.stringify(buckets, null, 2) }],
        };
      } catch (error) {
        return toMcpError(error);
      }
    }
  );

  server.tool(
    "s3_create_bucket",
    "Create a new S3 bucket in LocalStack",
    { bucket: z.string().min(1).describe("Bucket name") },
    async ({ bucket }) => {
      try {
        await s3Client.send(new CreateBucketCommand({ Bucket: bucket }));
        return {
          content: [{ type: "text", text: `Bucket '${bucket}' created successfully.` }],
        };
      } catch (error) {
        return toMcpError(error);
      }
    }
  );

  server.tool(
    "s3_delete_bucket",
    "Delete an S3 bucket from LocalStack",
    { bucket: z.string().min(1).describe("Bucket name") },
    async ({ bucket }) => {
      try {
        await s3Client.send(new DeleteBucketCommand({ Bucket: bucket }));
        return {
          content: [{ type: "text", text: `Bucket '${bucket}' deleted successfully.` }],
        };
      } catch (error) {
        return toMcpError(error);
      }
    }
  );

  server.tool(
    "s3_put_object",
    "Upload a text or JSON object to an S3 bucket in LocalStack",
    {
      bucket: z.string().min(1).describe("Bucket name"),
      key: z.string().min(1).describe("Object key (path)"),
      body: z.string().describe("Object content as a string"),
      contentType: z.string().optional().describe("Content-Type header (default: text/plain)"),
    },
    async ({ bucket, key, body, contentType }) => {
      try {
        await s3Client.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            Body: body,
            ContentType: contentType ?? "text/plain",
          })
        );
        return {
          content: [{ type: "text", text: `Object '${key}' uploaded to bucket '${bucket}'.` }],
        };
      } catch (error) {
        return toMcpError(error);
      }
    }
  );

  server.tool(
    "s3_get_object",
    "Download the content of an S3 object as text from LocalStack",
    {
      bucket: z.string().min(1).describe("Bucket name"),
      key: z.string().min(1).describe("Object key (path)"),
    },
    async ({ bucket, key }) => {
      try {
        const result = await s3Client.send(
          new GetObjectCommand({ Bucket: bucket, Key: key })
        );
        const text = await result.Body?.transformToString();
        return {
          content: [{ type: "text", text: text ?? "" }],
        };
      } catch (error) {
        return toMcpError(error);
      }
    }
  );

  server.tool(
    "s3_delete_object",
    "Delete an object from an S3 bucket in LocalStack",
    {
      bucket: z.string().min(1).describe("Bucket name"),
      key: z.string().min(1).describe("Object key (path)"),
    },
    async ({ bucket, key }) => {
      try {
        await s3Client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
        return {
          content: [{ type: "text", text: `Object '${key}' deleted from bucket '${bucket}'.` }],
        };
      } catch (error) {
        return toMcpError(error);
      }
    }
  );

  server.tool(
    "s3_list_objects",
    "List objects in an S3 bucket in LocalStack",
    {
      bucket: z.string().min(1).describe("Bucket name"),
      prefix: z.string().optional().describe("Filter objects by key prefix"),
      maxKeys: z.number().int().min(1).max(1000).optional().describe("Maximum number of objects to return (default: 100)"),
    },
    async ({ bucket, prefix, maxKeys }) => {
      try {
        const result = await s3Client.send(
          new ListObjectsV2Command({
            Bucket: bucket,
            Prefix: prefix,
            MaxKeys: maxKeys ?? 100,
          })
        );
        const objects = (result.Contents ?? []).map((o) => ({
          key: o.Key,
          size: o.Size,
          lastModified: o.LastModified?.toISOString(),
          etag: o.ETag,
        }));
        return {
          content: [{ type: "text", text: JSON.stringify(objects, null, 2) }],
        };
      } catch (error) {
        return toMcpError(error);
      }
    }
  );
}
