import {
  CreateFunctionCommand,
  DeleteFunctionCommand,
  GetFunctionCommand,
  InvokeCommand,
  LambdaClient,
  ListFunctionsCommand,
  Runtime,
  waitUntilFunctionActive,
} from "@aws-sdk/client-lambda";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { config } from "../src/config.js";

const client = new LambdaClient({
  endpoint: config.endpoint,
  region: config.region,
  credentials: config.credentials,
});

const FUNCTION_NAME = `test-fn-${Date.now()}`;
const ROLE_ARN = "arn:aws:iam::000000000000:role/lambda-role";

const INLINE_HANDLER = Buffer.from(
  `exports.handler = async (event) => ({ statusCode: 200, body: JSON.stringify({ hello: event.name ?? 'world' }) });`
).toString("base64");

async function buildMinimalZip(): Promise<Uint8Array> {
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  zip.file(
    "index.js",
    `exports.handler = async (event) => ({ statusCode: 200, body: JSON.stringify({ hello: event.name ?? 'world' }) });`
  );
  return zip.generateAsync({ type: "uint8array" });
}

let zipBytes: Uint8Array;

beforeAll(async () => {
  zipBytes = await buildMinimalZip();
  await client.send(
    new CreateFunctionCommand({
      FunctionName: FUNCTION_NAME,
      Runtime: Runtime.nodejs20x,
      Handler: "index.handler",
      Role: ROLE_ARN,
      Code: { ZipFile: zipBytes },
    })
  );
  await waitUntilFunctionActive(
    { client, maxWaitTime: 30 },
    { FunctionName: FUNCTION_NAME }
  );
});

afterAll(async () => {
  await client.send(new DeleteFunctionCommand({ FunctionName: FUNCTION_NAME }));
});

describe("Lambda — list functions", () => {
  it("returns the test function in the list", async () => {
    const result = await client.send(new ListFunctionsCommand({}));
    const names = (result.Functions ?? []).map((f) => f.FunctionName);
    expect(names).toContain(FUNCTION_NAME);
  });
});

describe("Lambda — get function", () => {
  it("returns function configuration", async () => {
    const result = await client.send(
      new GetFunctionCommand({ FunctionName: FUNCTION_NAME })
    );
    expect(result.Configuration?.FunctionName).toBe(FUNCTION_NAME);
    expect(result.Configuration?.Runtime).toBe(Runtime.nodejs20x);
    expect(result.Configuration?.Handler).toBe("index.handler");
  });
});

describe("Lambda — invoke", () => {
  it("invokes the function and returns a 200 response", async () => {
    const result = await client.send(
      new InvokeCommand({
        FunctionName: FUNCTION_NAME,
        Payload: Buffer.from(JSON.stringify({ name: "LocalStack" }), "utf-8"),
      })
    );
    expect(result.StatusCode).toBe(200);
    const payload = Buffer.from(result.Payload!).toString("utf-8");
    const parsed = JSON.parse(payload) as { statusCode: number; body: string };
    expect(parsed.statusCode).toBe(200);
    const body = JSON.parse(parsed.body) as { hello: string };
    expect(body.hello).toBe("LocalStack");
  });

  it("invokes the function without payload (uses default)", async () => {
    const result = await client.send(
      new InvokeCommand({ FunctionName: FUNCTION_NAME })
    );
    expect(result.StatusCode).toBe(200);
    const payload = Buffer.from(result.Payload!).toString("utf-8");
    const parsed = JSON.parse(payload) as { statusCode: number; body: string };
    const body = JSON.parse(parsed.body) as { hello: string };
    expect(body.hello).toBe("world");
  });
});

describe("Lambda — delete function", () => {
  const ephemeralFn = `ephemeral-fn-${Date.now()}`;

  it("creates and deletes an ephemeral function", async () => {
    await client.send(
      new CreateFunctionCommand({
        FunctionName: ephemeralFn,
        Runtime: Runtime.nodejs20x,
        Handler: "index.handler",
        Role: ROLE_ARN,
        Code: { ZipFile: zipBytes },
      })
    );
    await waitUntilFunctionActive(
      { client, maxWaitTime: 30 },
      { FunctionName: ephemeralFn }
    );
    await expect(
      client.send(new DeleteFunctionCommand({ FunctionName: ephemeralFn }))
    ).resolves.toBeDefined();
  });
});
