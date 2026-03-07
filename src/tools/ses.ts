import {
  DeleteIdentityCommand,
  GetIdentityVerificationAttributesCommand,
  ListIdentitiesCommand,
  SendEmailCommand,
  VerifyEmailIdentityCommand,
} from "@aws-sdk/client-ses";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { sesClient } from "../utils/client.js";
import { toMcpError } from "../utils/errors.js";

export function registerSesTools(server: McpServer): void {
  server.tool(
    "ses_list_identities",
    "List all SES verified identities (email addresses and domains) in LocalStack",
    {
      identityType: z
        .enum(["EmailAddress", "Domain"])
        .optional()
        .describe("Filter by identity type"),
    },
    async ({ identityType }) => {
      try {
        const result = await sesClient.send(
          new ListIdentitiesCommand({ IdentityType: identityType })
        );
        return {
          content: [{ type: "text", text: JSON.stringify(result.Identities ?? [], null, 2) }],
        };
      } catch (error) {
        return toMcpError(error);
      }
    }
  );

  server.tool(
    "ses_verify_email_identity",
    "Verify an email address identity in SES in LocalStack",
    {
      email: z.string().email().describe("Email address to verify"),
    },
    async ({ email }) => {
      try {
        await sesClient.send(new VerifyEmailIdentityCommand({ EmailAddress: email }));
        return {
          content: [{ type: "text", text: `Verification initiated for '${email}'. In LocalStack it is auto-verified.` }],
        };
      } catch (error) {
        return toMcpError(error);
      }
    }
  );

  server.tool(
    "ses_get_identity_verification_attributes",
    "Get verification status for SES identities in LocalStack",
    {
      identities: z
        .array(z.string().min(1))
        .min(1)
        .describe("List of email addresses or domain names to check"),
    },
    async ({ identities }) => {
      try {
        const result = await sesClient.send(
          new GetIdentityVerificationAttributesCommand({ Identities: identities })
        );
        const attrs = Object.entries(result.VerificationAttributes ?? {}).map(([id, attr]) => ({
          identity: id,
          verificationStatus: attr.VerificationStatus,
          verificationToken: attr.VerificationToken,
        }));
        return {
          content: [{ type: "text", text: JSON.stringify(attrs, null, 2) }],
        };
      } catch (error) {
        return toMcpError(error);
      }
    }
  );

  server.tool(
    "ses_delete_identity",
    "Delete an SES identity in LocalStack",
    {
      identity: z.string().min(1).describe("Email address or domain name to delete"),
    },
    async ({ identity }) => {
      try {
        await sesClient.send(new DeleteIdentityCommand({ Identity: identity }));
        return {
          content: [{ type: "text", text: `Identity '${identity}' deleted successfully.` }],
        };
      } catch (error) {
        return toMcpError(error);
      }
    }
  );

  server.tool(
    "ses_send_email",
    "Send an email via SES in LocalStack",
    {
      from: z.string().email().describe("Sender email address (must be verified)"),
      to: z.array(z.string().email()).min(1).describe("Recipient email addresses"),
      subject: z.string().min(1).describe("Email subject"),
      body: z.string().min(1).describe("Email body (plain text)"),
      htmlBody: z.string().optional().describe("Email body as HTML (optional)"),
      cc: z.array(z.string().email()).optional().describe("CC recipients"),
      bcc: z.array(z.string().email()).optional().describe("BCC recipients"),
    },
    async ({ from, to, subject, body, htmlBody, cc, bcc }) => {
      try {
        const result = await sesClient.send(
          new SendEmailCommand({
            Source: from,
            Destination: {
              ToAddresses: to,
              CcAddresses: cc,
              BccAddresses: bcc,
            },
            Message: {
              Subject: { Data: subject },
              Body: {
                Text: { Data: body },
                ...(htmlBody ? { Html: { Data: htmlBody } } : {}),
              },
            },
          })
        );
        return {
          content: [{ type: "text", text: `Email sent. MessageId: ${result.MessageId}` }],
        };
      } catch (error) {
        return toMcpError(error);
      }
    }
  );
}
