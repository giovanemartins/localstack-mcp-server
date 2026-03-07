import {
  CreateSecretCommand,
  DeleteSecretCommand,
  DescribeSecretCommand,
  GetSecretValueCommand,
  ListSecretsCommand,
  PutSecretValueCommand,
  SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { config } from "../src/config.js";

const client = new SecretsManagerClient({
  endpoint: config.endpoint,
  region: config.region,
  credentials: config.credentials,
});

const SECRET_NAME = `test-secret-${Date.now()}`;
let secretArn: string;

beforeAll(async () => {
  const result = await client.send(
    new CreateSecretCommand({
      Name: SECRET_NAME,
      SecretString: JSON.stringify({ username: "admin", password: "s3cr3t" }),
      Description: "Test secret",
    })
  );
  secretArn = result.ARN!;
});

afterAll(async () => {
  await client.send(
    new DeleteSecretCommand({ SecretId: SECRET_NAME, ForceDeleteWithoutRecovery: true })
  );
});

describe("Secrets Manager — list secrets", () => {
  it("returns the test secret in the list", async () => {
    const result = await client.send(new ListSecretsCommand({}));
    const names = (result.SecretList ?? []).map((s) => s.Name);
    expect(names).toContain(SECRET_NAME);
  });
});

describe("Secrets Manager — get secret", () => {
  it("retrieves the secret value", async () => {
    const result = await client.send(
      new GetSecretValueCommand({ SecretId: SECRET_NAME })
    );
    expect(result.SecretString).toBeDefined();
    const parsed = JSON.parse(result.SecretString!) as { username: string; password: string };
    expect(parsed.username).toBe("admin");
    expect(parsed.password).toBe("s3cr3t");
  });
});

describe("Secrets Manager — describe secret", () => {
  it("returns secret metadata", async () => {
    const result = await client.send(
      new DescribeSecretCommand({ SecretId: SECRET_NAME })
    );
    expect(result.Name).toBe(SECRET_NAME);
    expect(result.Description).toBe("Test secret");
    expect(result.ARN).toBe(secretArn);
  });
});

describe("Secrets Manager — update secret", () => {
  it("updates the secret value", async () => {
    const result = await client.send(
      new PutSecretValueCommand({
        SecretId: SECRET_NAME,
        SecretString: JSON.stringify({ username: "admin", password: "n3wP@ss" }),
      })
    );
    expect(result.VersionId).toBeDefined();
  });

  it("reflects the updated value on next get", async () => {
    const result = await client.send(
      new GetSecretValueCommand({ SecretId: SECRET_NAME })
    );
    const parsed = JSON.parse(result.SecretString!) as { password: string };
    expect(parsed.password).toBe("n3wP@ss");
  });
});

describe("Secrets Manager — create & delete", () => {
  const ephemeralSecret = `ephemeral-secret-${Date.now()}`;

  it("creates an ephemeral secret", async () => {
    const result = await client.send(
      new CreateSecretCommand({ Name: ephemeralSecret, SecretString: "temp" })
    );
    expect(result.ARN).toBeDefined();
  });

  it("force-deletes the ephemeral secret", async () => {
    await expect(
      client.send(
        new DeleteSecretCommand({
          SecretId: ephemeralSecret,
          ForceDeleteWithoutRecovery: true,
        })
      )
    ).resolves.toBeDefined();
  });
});
