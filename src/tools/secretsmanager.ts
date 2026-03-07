import {
  CreateSecretCommand,
  DeleteSecretCommand,
  DescribeSecretCommand,
  GetSecretValueCommand,
  ListSecretsCommand,
  PutSecretValueCommand,
  RestoreSecretCommand,
} from "@aws-sdk/client-secrets-manager";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { secretsManagerClient } from "../utils/client.js";
import { toMcpError } from "../utils/errors.js";

export function registerSecretsManagerTools(server: McpServer): void {
  server.tool(
    "secretsmanager_list_secrets",
    "List all secrets in Secrets Manager in LocalStack",
    {},
    async () => {
      try {
        const result = await secretsManagerClient.send(new ListSecretsCommand({}));
        const secrets = (result.SecretList ?? []).map((s) => ({
          name: s.Name,
          arn: s.ARN,
          description: s.Description,
          lastChangedDate: s.LastChangedDate?.toISOString(),
        }));
        return {
          content: [{ type: "text", text: JSON.stringify(secrets, null, 2) }],
        };
      } catch (error) {
        return toMcpError(error);
      }
    }
  );

  server.tool(
    "secretsmanager_create_secret",
    "Create a new secret in Secrets Manager in LocalStack",
    {
      name: z.string().min(1).describe("Secret name"),
      secretString: z.string().optional().describe("Secret value as a string or JSON string"),
      description: z.string().optional().describe("Secret description"),
    },
    async ({ name, secretString, description }) => {
      try {
        const result = await secretsManagerClient.send(
          new CreateSecretCommand({
            Name: name,
            SecretString: secretString,
            Description: description,
          })
        );
        return {
          content: [{ type: "text", text: `Secret created. ARN: ${result.ARN}` }],
        };
      } catch (error) {
        return toMcpError(error);
      }
    }
  );

  server.tool(
    "secretsmanager_get_secret",
    "Retrieve the value of a secret from Secrets Manager in LocalStack",
    {
      secretId: z.string().min(1).describe("Secret name or ARN"),
    },
    async ({ secretId }) => {
      try {
        const result = await secretsManagerClient.send(
          new GetSecretValueCommand({ SecretId: secretId })
        );
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  name: result.Name,
                  arn: result.ARN,
                  secretString: result.SecretString,
                  versionId: result.VersionId,
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
    "secretsmanager_update_secret",
    "Update the value of an existing secret in Secrets Manager in LocalStack",
    {
      secretId: z.string().min(1).describe("Secret name or ARN"),
      secretString: z.string().min(1).describe("New secret value as a string or JSON string"),
    },
    async ({ secretId, secretString }) => {
      try {
        const result = await secretsManagerClient.send(
          new PutSecretValueCommand({ SecretId: secretId, SecretString: secretString })
        );
        return {
          content: [{ type: "text", text: `Secret updated. VersionId: ${result.VersionId}` }],
        };
      } catch (error) {
        return toMcpError(error);
      }
    }
  );

  server.tool(
    "secretsmanager_describe_secret",
    "Describe a secret's metadata in Secrets Manager in LocalStack",
    {
      secretId: z.string().min(1).describe("Secret name or ARN"),
    },
    async ({ secretId }) => {
      try {
        const result = await secretsManagerClient.send(
          new DescribeSecretCommand({ SecretId: secretId })
        );
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  name: result.Name,
                  arn: result.ARN,
                  description: result.Description,
                  lastChangedDate: result.LastChangedDate?.toISOString(),
                  deletedDate: result.DeletedDate?.toISOString(),
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
    "secretsmanager_delete_secret",
    "Delete a secret from Secrets Manager in LocalStack",
    {
      secretId: z.string().min(1).describe("Secret name or ARN"),
      forceDelete: z.boolean().optional().describe("Force delete without recovery window (default: false)"),
    },
    async ({ secretId, forceDelete }) => {
      try {
        await secretsManagerClient.send(
          new DeleteSecretCommand({
            SecretId: secretId,
            ForceDeleteWithoutRecovery: forceDelete ?? false,
          })
        );
        return {
          content: [{ type: "text", text: `Secret '${secretId}' deleted successfully.` }],
        };
      } catch (error) {
        return toMcpError(error);
      }
    }
  );

  server.tool(
    "secretsmanager_restore_secret",
    "Restore a previously deleted secret in Secrets Manager in LocalStack",
    {
      secretId: z.string().min(1).describe("Secret name or ARN"),
    },
    async ({ secretId }) => {
      try {
        const result = await secretsManagerClient.send(
          new RestoreSecretCommand({ SecretId: secretId })
        );
        return {
          content: [{ type: "text", text: `Secret restored. ARN: ${result.ARN}` }],
        };
      } catch (error) {
        return toMcpError(error);
      }
    }
  );
}
