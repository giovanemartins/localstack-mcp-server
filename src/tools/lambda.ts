import {
  CreateFunctionCommand,
  DeleteFunctionCommand,
  GetFunctionCommand,
  InvokeCommand,
  ListFunctionsCommand,
  Runtime,
} from "@aws-sdk/client-lambda";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { lambdaClient } from "../utils/client.js";
import { toMcpError } from "../utils/errors.js";

export function registerLambdaTools(server: McpServer): void {
  server.tool(
    "lambda_list_functions",
    "List all Lambda functions in LocalStack",
    {},
    async () => {
      try {
        const result = await lambdaClient.send(new ListFunctionsCommand({}));
        const functions = (result.Functions ?? []).map((f) => ({
          functionName: f.FunctionName,
          runtime: f.Runtime,
          handler: f.Handler,
          description: f.Description,
          lastModified: f.LastModified,
        }));
        return {
          content: [{ type: "text", text: JSON.stringify(functions, null, 2) }],
        };
      } catch (error) {
        return toMcpError(error);
      }
    }
  );

  server.tool(
    "lambda_get_function",
    "Get details of a Lambda function in LocalStack",
    {
      functionName: z.string().min(1).describe("Function name or ARN"),
    },
    async ({ functionName }) => {
      try {
        const result = await lambdaClient.send(
          new GetFunctionCommand({ FunctionName: functionName })
        );
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  functionName: result.Configuration?.FunctionName,
                  runtime: result.Configuration?.Runtime,
                  handler: result.Configuration?.Handler,
                  description: result.Configuration?.Description,
                  memorySize: result.Configuration?.MemorySize,
                  timeout: result.Configuration?.Timeout,
                  lastModified: result.Configuration?.LastModified,
                  state: result.Configuration?.State,
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
    "lambda_create_function",
    "Create a Lambda function in LocalStack from a base64-encoded ZIP",
    {
      functionName: z.string().min(1).describe("Function name"),
      runtime: z
        .enum(["nodejs20.x", "nodejs18.x", "python3.12", "python3.11", "python3.10", "java21", "java17"])
        .describe("Runtime identifier"),
      handler: z.string().min(1).describe("Handler in format file.function (e.g. index.handler)"),
      roleArn: z.string().min(1).describe("IAM role ARN (use arn:aws:iam::000000000000:role/lambda-role for LocalStack)"),
      zipBase64: z.string().min(1).describe("Base64-encoded ZIP file contents"),
      description: z.string().optional().describe("Function description"),
      timeout: z.number().int().min(1).max(900).optional().describe("Timeout in seconds (default: 30)"),
      memorySize: z.number().int().min(128).max(10240).optional().describe("Memory size in MB (default: 128)"),
      environment: z.record(z.string()).optional().describe("Environment variables as a key-value object"),
    },
    async ({ functionName, runtime, handler, roleArn, zipBase64, description, timeout, memorySize, environment }) => {
      try {
        const result = await lambdaClient.send(
          new CreateFunctionCommand({
            FunctionName: functionName,
            Runtime: runtime as Runtime,
            Handler: handler,
            Role: roleArn,
            Code: { ZipFile: Buffer.from(zipBase64, "base64") },
            Description: description,
            Timeout: timeout ?? 30,
            MemorySize: memorySize ?? 128,
            Environment: environment ? { Variables: environment } : undefined,
          })
        );
        return {
          content: [
            {
              type: "text",
              text: `Function '${functionName}' created. ARN: ${result.FunctionArn}`,
            },
          ],
        };
      } catch (error) {
        return toMcpError(error);
      }
    }
  );

  server.tool(
    "lambda_delete_function",
    "Delete a Lambda function from LocalStack",
    {
      functionName: z.string().min(1).describe("Function name or ARN"),
    },
    async ({ functionName }) => {
      try {
        await lambdaClient.send(new DeleteFunctionCommand({ FunctionName: functionName }));
        return {
          content: [{ type: "text", text: `Function '${functionName}' deleted successfully.` }],
        };
      } catch (error) {
        return toMcpError(error);
      }
    }
  );

  server.tool(
    "lambda_invoke",
    "Invoke a Lambda function in LocalStack and return its response",
    {
      functionName: z.string().min(1).describe("Function name or ARN"),
      payload: z.string().optional().describe("Invocation payload as a JSON string"),
      invocationType: z
        .enum(["RequestResponse", "Event", "DryRun"])
        .optional()
        .describe("Invocation type (default: RequestResponse)"),
    },
    async ({ functionName, payload, invocationType }) => {
      try {
        const result = await lambdaClient.send(
          new InvokeCommand({
            FunctionName: functionName,
            Payload: payload ? Buffer.from(payload, "utf-8") : undefined,
            InvocationType: invocationType ?? "RequestResponse",
          })
        );
        const responsePayload = result.Payload
          ? Buffer.from(result.Payload).toString("utf-8")
          : null;
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  statusCode: result.StatusCode,
                  functionError: result.FunctionError,
                  logResult: result.LogResult
                    ? Buffer.from(result.LogResult, "base64").toString("utf-8")
                    : null,
                  payload: responsePayload,
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
}
