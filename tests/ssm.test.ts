import {
  DeleteParameterCommand,
  DeleteParametersCommand,
  DescribeParametersCommand,
  GetParameterCommand,
  GetParametersByPathCommand,
  PutParameterCommand,
  SSMClient,
} from "@aws-sdk/client-ssm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { config } from "../src/config.js";

const client = new SSMClient({
  endpoint: config.endpoint,
  region: config.region,
  credentials: config.credentials,
});

const PARAM_PREFIX = `/test-${Date.now()}`;
const PARAM_NAME = `${PARAM_PREFIX}/db/password`;

beforeAll(async () => {
  await client.send(
    new PutParameterCommand({
      Name: PARAM_NAME,
      Value: "supersecret",
      Type: "String",
      Description: "Test parameter",
      Overwrite: true,
    })
  );
});

afterAll(async () => {
  await client.send(new DeleteParameterCommand({ Name: PARAM_NAME })).catch(() => {});
});

describe("SSM — get parameter", () => {
  it("retrieves the parameter value", async () => {
    const result = await client.send(
      new GetParameterCommand({ Name: PARAM_NAME, WithDecryption: true })
    );
    expect(result.Parameter?.Name).toBe(PARAM_NAME);
    expect(result.Parameter?.Value).toBe("supersecret");
  });
});

describe("SSM — put parameter (overwrite)", () => {
  it("overwrites the parameter value", async () => {
    await client.send(
      new PutParameterCommand({
        Name: PARAM_NAME,
        Value: "updated-secret",
        Type: "String",
        Overwrite: true,
      })
    );
    const result = await client.send(
      new GetParameterCommand({ Name: PARAM_NAME })
    );
    expect(result.Parameter?.Value).toBe("updated-secret");
  });
});

describe("SSM — get parameters by path", () => {
  it("retrieves parameters under the path prefix", async () => {
    const result = await client.send(
      new GetParametersByPathCommand({
        Path: PARAM_PREFIX,
        Recursive: true,
        WithDecryption: true,
      })
    );
    const names = (result.Parameters ?? []).map((p) => p.Name);
    expect(names).toContain(PARAM_NAME);
  });
});

describe("SSM — describe parameters", () => {
  it("lists parameter metadata", async () => {
    const result = await client.send(new DescribeParametersCommand({ MaxResults: 50 }));
    expect((result.Parameters ?? []).length).toBeGreaterThan(0);
  });
});

describe("SSM — delete parameter", () => {
  const ephemeralParam = `/test-ephemeral-${Date.now()}`;

  it("creates and deletes a parameter", async () => {
    await client.send(
      new PutParameterCommand({ Name: ephemeralParam, Value: "tmp", Type: "String", Overwrite: true })
    );
    await expect(
      client.send(new DeleteParameterCommand({ Name: ephemeralParam }))
    ).resolves.toBeDefined();
  });
});

describe("SSM — delete parameters (batch)", () => {
  const p1 = `/test-batch-${Date.now()}-a`;
  const p2 = `/test-batch-${Date.now()}-b`;

  it("creates and batch-deletes two parameters", async () => {
    await client.send(new PutParameterCommand({ Name: p1, Value: "a", Type: "String", Overwrite: true }));
    await client.send(new PutParameterCommand({ Name: p2, Value: "b", Type: "String", Overwrite: true }));

    const result = await client.send(new DeleteParametersCommand({ Names: [p1, p2] }));
    expect(result.DeletedParameters ?? []).toContain(p1);
    expect(result.DeletedParameters ?? []).toContain(p2);
    expect(result.InvalidParameters ?? []).toHaveLength(0);
  });
});
