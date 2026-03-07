import {
  CreateStreamCommand,
  DeleteStreamCommand,
  DescribeStreamCommand,
  GetRecordsCommand,
  GetShardIteratorCommand,
  ListStreamsCommand,
  PutRecordCommand,
  PutRecordsCommand,
} from "@aws-sdk/client-kinesis";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { kinesisClient } from "../utils/client.js";
import { toMcpError } from "../utils/errors.js";

export function registerKinesisTools(server: McpServer): void {
  server.tool(
    "kinesis_list_streams",
    "List all Kinesis streams in LocalStack",
    {},
    async () => {
      try {
        const result = await kinesisClient.send(new ListStreamsCommand({}));
        return {
          content: [{ type: "text", text: JSON.stringify(result.StreamNames ?? [], null, 2) }],
        };
      } catch (error) {
        return toMcpError(error);
      }
    }
  );

  server.tool(
    "kinesis_create_stream",
    "Create a new Kinesis stream in LocalStack",
    {
      name: z.string().min(1).describe("Stream name"),
      shardCount: z.number().int().min(1).optional().describe("Number of shards (default: 1)"),
    },
    async ({ name, shardCount }) => {
      try {
        await kinesisClient.send(
          new CreateStreamCommand({ StreamName: name, ShardCount: shardCount ?? 1 })
        );
        return {
          content: [{ type: "text", text: `Stream '${name}' created successfully.` }],
        };
      } catch (error) {
        return toMcpError(error);
      }
    }
  );

  server.tool(
    "kinesis_delete_stream",
    "Delete a Kinesis stream from LocalStack",
    {
      name: z.string().min(1).describe("Stream name"),
    },
    async ({ name }) => {
      try {
        await kinesisClient.send(new DeleteStreamCommand({ StreamName: name }));
        return {
          content: [{ type: "text", text: `Stream '${name}' deleted successfully.` }],
        };
      } catch (error) {
        return toMcpError(error);
      }
    }
  );

  server.tool(
    "kinesis_describe_stream",
    "Describe a Kinesis stream in LocalStack",
    {
      name: z.string().min(1).describe("Stream name"),
    },
    async ({ name }) => {
      try {
        const result = await kinesisClient.send(
          new DescribeStreamCommand({ StreamName: name })
        );
        const desc = result.StreamDescription;
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  streamName: desc?.StreamName,
                  streamArn: desc?.StreamARN,
                  streamStatus: desc?.StreamStatus,
                  shards: desc?.Shards?.map((s) => ({ shardId: s.ShardId })),
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
    "kinesis_put_record",
    "Put a single record onto a Kinesis stream in LocalStack",
    {
      streamName: z.string().min(1).describe("Stream name"),
      data: z.string().min(1).describe("Record data as a string (will be UTF-8 encoded)"),
      partitionKey: z.string().min(1).describe("Partition key for the record"),
    },
    async ({ streamName, data, partitionKey }) => {
      try {
        const result = await kinesisClient.send(
          new PutRecordCommand({
            StreamName: streamName,
            Data: Buffer.from(data, "utf-8"),
            PartitionKey: partitionKey,
          })
        );
        return {
          content: [
            {
              type: "text",
              text: `Record put. ShardId: ${result.ShardId}, SequenceNumber: ${result.SequenceNumber}`,
            },
          ],
        };
      } catch (error) {
        return toMcpError(error);
      }
    }
  );

  server.tool(
    "kinesis_put_records",
    "Put multiple records onto a Kinesis stream in LocalStack (max 500)",
    {
      streamName: z.string().min(1).describe("Stream name"),
      records: z
        .array(
          z.object({
            data: z.string().min(1).describe("Record data as a string"),
            partitionKey: z.string().min(1).describe("Partition key"),
          })
        )
        .min(1)
        .max(500)
        .describe("Records to put"),
    },
    async ({ streamName, records }) => {
      try {
        const result = await kinesisClient.send(
          new PutRecordsCommand({
            StreamName: streamName,
            Records: records.map((r) => ({
              Data: Buffer.from(r.data, "utf-8"),
              PartitionKey: r.partitionKey,
            })),
          })
        );
        return {
          content: [
            {
              type: "text",
              text: `Records put. Failed: ${result.FailedRecordCount ?? 0}`,
            },
          ],
        };
      } catch (error) {
        return toMcpError(error);
      }
    }
  );

  server.tool(
    "kinesis_get_records",
    "Get records from a Kinesis stream shard in LocalStack",
    {
      streamName: z.string().min(1).describe("Stream name"),
      shardId: z.string().min(1).describe("Shard ID (e.g. shardId-000000000000)"),
      shardIteratorType: z
        .enum(["TRIM_HORIZON", "LATEST", "AT_SEQUENCE_NUMBER", "AFTER_SEQUENCE_NUMBER"])
        .optional()
        .describe("Iterator type (default: TRIM_HORIZON)"),
      limit: z.number().int().min(1).max(10000).optional().describe("Max records to return (default: 10)"),
    },
    async ({ streamName, shardId, shardIteratorType, limit }) => {
      try {
        const iterResult = await kinesisClient.send(
          new GetShardIteratorCommand({
            StreamName: streamName,
            ShardId: shardId,
            ShardIteratorType: shardIteratorType ?? "TRIM_HORIZON",
          })
        );
        const records = await kinesisClient.send(
          new GetRecordsCommand({
            ShardIterator: iterResult.ShardIterator!,
            Limit: limit ?? 10,
          })
        );
        const decoded = (records.Records ?? []).map((r) => ({
          sequenceNumber: r.SequenceNumber,
          partitionKey: r.PartitionKey,
          data: r.Data ? Buffer.from(r.Data).toString("utf-8") : null,
          approximateArrivalTimestamp: r.ApproximateArrivalTimestamp?.toISOString(),
        }));
        return {
          content: [{ type: "text", text: JSON.stringify(decoded, null, 2) }],
        };
      } catch (error) {
        return toMcpError(error);
      }
    }
  );
}
