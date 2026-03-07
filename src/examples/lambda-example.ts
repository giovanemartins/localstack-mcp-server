import {
  CreateFunctionCommand,
  DeleteFunctionCommand,
  InvokeCommand,
  Runtime,
  waitUntilFunctionActiveV2,
} from "@aws-sdk/client-lambda";
import JSZip from "jszip";
import { lambdaClient } from "../utils/client.js";

const FUNCTION_NAME = "my-example-function";
const ROLE_ARN = "arn:aws:iam::000000000000:role/lambda-role";

const HANDLER_CODE = `
exports.handler = async (event) => {
  console.log("Event received:", JSON.stringify(event));
  return {
    statusCode: 200,
    message: "Hello from Lambda!",
    input: event,
    timestamp: new Date().toISOString(),
  };
};
`;

async function buildZip(): Promise<Uint8Array> {
  const zip = new JSZip();
  zip.file("index.js", HANDLER_CODE);
  return zip.generateAsync({ type: "uint8array" });
}

async function createFunction(): Promise<void> {
  console.log(`Creating Lambda function '${FUNCTION_NAME}'...`);

  const zipBuffer = await buildZip();

  await lambdaClient.send(
    new CreateFunctionCommand({
      FunctionName: FUNCTION_NAME,
      Runtime: Runtime.nodejs20x,
      Handler: "index.handler",
      Role: ROLE_ARN,
      Code: { ZipFile: zipBuffer },
      Description: "Example Lambda function",
      Timeout: 30,
      MemorySize: 128,
    })
  );

  console.log("  Waiting for function to become active...");
  await waitUntilFunctionActiveV2(
    { client: lambdaClient, maxWaitTime: 30 },
    { FunctionName: FUNCTION_NAME }
  );

  console.log("  Function is active.\n");
}

async function invokeFunction(): Promise<void> {
  console.log(`Invoking '${FUNCTION_NAME}'...`);

  const payload = { orderId: "ord-001", action: "process" };

  const result = await lambdaClient.send(
    new InvokeCommand({
      FunctionName: FUNCTION_NAME,
      Payload: Buffer.from(JSON.stringify(payload), "utf-8"),
    })
  );

  const responsePayload = result.Payload
    ? JSON.parse(Buffer.from(result.Payload).toString("utf-8"))
    : null;

  console.log(`  Status code: ${result.StatusCode}`);
  if (result.FunctionError) {
    console.error(`  Function error: ${result.FunctionError}`);
  }
  console.log("  Response:", JSON.stringify(responsePayload, null, 2), "\n");
}

async function deleteFunction(): Promise<void> {
  console.log(`Cleaning up — deleting '${FUNCTION_NAME}'...`);
  await lambdaClient.send(new DeleteFunctionCommand({ FunctionName: FUNCTION_NAME }));
  console.log("  Function deleted.");
}

async function main(): Promise<void> {
  await createFunction();
  await invokeFunction();
  await deleteFunction();
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
