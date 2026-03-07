import {
  DeleteIdentityCommand,
  GetIdentityVerificationAttributesCommand,
  ListIdentitiesCommand,
  SESClient,
  SendEmailCommand,
  VerifyEmailIdentityCommand,
} from "@aws-sdk/client-ses";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { config } from "../src/config.js";

const client = new SESClient({
  endpoint: config.endpoint,
  region: config.region,
  credentials: config.credentials,
});

const TEST_EMAIL = `test-${Date.now()}@example.com`;

beforeAll(async () => {
  await client.send(new VerifyEmailIdentityCommand({ EmailAddress: TEST_EMAIL }));
});

afterAll(async () => {
  await client.send(new DeleteIdentityCommand({ Identity: TEST_EMAIL })).catch(() => {});
});

describe("SES — list identities", () => {
  it("returns the verified email in the list", async () => {
    const result = await client.send(new ListIdentitiesCommand({ IdentityType: "EmailAddress" }));
    expect(result.Identities ?? []).toContain(TEST_EMAIL);
  });
});

describe("SES — get verification attributes", () => {
  it("shows the identity as verified in LocalStack", async () => {
    const result = await client.send(
      new GetIdentityVerificationAttributesCommand({ Identities: [TEST_EMAIL] })
    );
    const attr = result.VerificationAttributes?.[TEST_EMAIL];
    expect(attr).toBeDefined();
    expect(attr?.VerificationStatus).toBe("Success");
  });
});

describe("SES — send email", () => {
  it("sends an email and returns a MessageId", async () => {
    const result = await client.send(
      new SendEmailCommand({
        Source: TEST_EMAIL,
        Destination: { ToAddresses: [TEST_EMAIL] },
        Message: {
          Subject: { Data: "Test email from LocalStack" },
          Body: {
            Text: { Data: "Hello from the LocalStack MCP server test suite!" },
          },
        },
      })
    );
    expect(result.MessageId).toBeDefined();
  });
});

describe("SES — verify & delete identity", () => {
  const ephemeralEmail = `ephemeral-${Date.now()}@example.com`;

  it("verifies an ephemeral email", async () => {
    await expect(
      client.send(new VerifyEmailIdentityCommand({ EmailAddress: ephemeralEmail }))
    ).resolves.toBeDefined();
  });

  it("deletes the ephemeral email identity", async () => {
    await expect(
      client.send(new DeleteIdentityCommand({ Identity: ephemeralEmail }))
    ).resolves.toBeDefined();
  });
});
