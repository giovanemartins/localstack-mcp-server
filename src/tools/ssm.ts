import {
  DeleteParameterCommand,
  DeleteParametersCommand,
  DescribeParametersCommand,
  GetParameterCommand,
  GetParametersByPathCommand,
  ParameterType,
  PutParameterCommand,
} from "@aws-sdk/client-ssm";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ssmClient } from "../utils/client.js";
import { toMcpError } from "../utils/errors.js";

export function registerSsmTools(server: McpServer): void {
  server.tool(
    "ssm_get_parameter",
    "Get an SSM Parameter Store parameter by name in LocalStack",
    {
      name: z.string().min(1).describe("Parameter name (e.g. /myapp/db/password)"),
      withDecryption: z.boolean().optional().describe("Decrypt SecureString parameters (default: true)"),
    },
    async ({ name, withDecryption }) => {
      try {
        const result = await ssmClient.send(
          new GetParameterCommand({ Name: name, WithDecryption: withDecryption ?? true })
        );
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  name: result.Parameter?.Name,
                  type: result.Parameter?.Type,
                  value: result.Parameter?.Value,
                  version: result.Parameter?.Version,
                  lastModifiedDate: result.Parameter?.LastModifiedDate?.toISOString(),
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
    "ssm_put_parameter",
    "Create or update an SSM Parameter Store parameter in LocalStack",
    {
      name: z.string().min(1).describe("Parameter name (e.g. /myapp/db/password)"),
      value: z.string().min(1).describe("Parameter value"),
      type: z
        .enum(["String", "StringList", "SecureString"])
        .optional()
        .describe("Parameter type (default: String)"),
      description: z.string().optional().describe("Parameter description"),
      overwrite: z.boolean().optional().describe("Overwrite existing parameter (default: true)"),
    },
    async ({ name, value, type, description, overwrite }) => {
      try {
        const result = await ssmClient.send(
          new PutParameterCommand({
            Name: name,
            Value: value,
            Type: (type ?? "String") as ParameterType,
            Description: description,
            Overwrite: overwrite ?? true,
          })
        );
        return {
          content: [{ type: "text", text: `Parameter '${name}' saved. Version: ${result.Version}` }],
        };
      } catch (error) {
        return toMcpError(error);
      }
    }
  );

  server.tool(
    "ssm_delete_parameter",
    "Delete an SSM Parameter Store parameter in LocalStack",
    {
      name: z.string().min(1).describe("Parameter name"),
    },
    async ({ name }) => {
      try {
        await ssmClient.send(new DeleteParameterCommand({ Name: name }));
        return {
          content: [{ type: "text", text: `Parameter '${name}' deleted successfully.` }],
        };
      } catch (error) {
        return toMcpError(error);
      }
    }
  );

  server.tool(
    "ssm_delete_parameters",
    "Delete multiple SSM Parameter Store parameters in LocalStack",
    {
      names: z.array(z.string().min(1)).min(1).max(10).describe("List of parameter names to delete (max 10)"),
    },
    async ({ names }) => {
      try {
        const result = await ssmClient.send(new DeleteParametersCommand({ Names: names }));
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  deleted: result.DeletedParameters ?? [],
                  invalidParameters: result.InvalidParameters ?? [],
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
    "ssm_get_parameters_by_path",
    "Get all SSM Parameter Store parameters under a path in LocalStack",
    {
      path: z.string().min(1).describe("Parameter path prefix (e.g. /myapp/)"),
      recursive: z.boolean().optional().describe("Recursively retrieve nested parameters (default: true)"),
      withDecryption: z.boolean().optional().describe("Decrypt SecureString parameters (default: true)"),
    },
    async ({ path, recursive, withDecryption }) => {
      try {
        const result = await ssmClient.send(
          new GetParametersByPathCommand({
            Path: path,
            Recursive: recursive ?? true,
            WithDecryption: withDecryption ?? true,
          })
        );
        const params = (result.Parameters ?? []).map((p) => ({
          name: p.Name,
          type: p.Type,
          value: p.Value,
          version: p.Version,
        }));
        return {
          content: [{ type: "text", text: JSON.stringify(params, null, 2) }],
        };
      } catch (error) {
        return toMcpError(error);
      }
    }
  );

  server.tool(
    "ssm_describe_parameters",
    "List and describe SSM Parameter Store parameters in LocalStack",
    {
      maxResults: z.number().int().min(1).max(50).optional().describe("Maximum number of results (default: 50)"),
    },
    async ({ maxResults }) => {
      try {
        const result = await ssmClient.send(
          new DescribeParametersCommand({ MaxResults: maxResults ?? 50 })
        );
        const params = (result.Parameters ?? []).map((p) => ({
          name: p.Name,
          type: p.Type,
          description: p.Description,
          lastModifiedDate: p.LastModifiedDate?.toISOString(),
        }));
        return {
          content: [{ type: "text", text: JSON.stringify(params, null, 2) }],
        };
      } catch (error) {
        return toMcpError(error);
      }
    }
  );
}
