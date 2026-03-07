import {
  DeleteParameterCommand,
  GetParameterCommand,
  GetParametersByPathCommand,
  PutParameterCommand,
} from "@aws-sdk/client-ssm";
import { ssmClient } from "../utils/client.js";

const PARAM_PATH = "/myapp/";

const PARAMETERS = [
  { name: "/myapp/db/host", value: "localhost", description: "Database host" },
  { name: "/myapp/db/port", value: "5432", description: "Database port" },
  { name: "/myapp/db/password", value: "s3cr3t!", type: "SecureString" as const, description: "Database password" },
];

async function putParameters(): Promise<void> {
  console.log("Putting parameters into SSM Parameter Store...\n");

  for (const param of PARAMETERS) {
    await ssmClient.send(
      new PutParameterCommand({
        Name: param.name,
        Value: param.value,
        Type: param.type ?? "String",
        Description: param.description,
        Overwrite: true,
      })
    );
    console.log(`  [PUT] ${param.name} = ${param.type === "SecureString" ? "***" : param.value}`);
  }

  console.log();
}

async function getParameter(): Promise<void> {
  const name = "/myapp/db/host";
  console.log(`Getting single parameter '${name}'...`);

  const result = await ssmClient.send(
    new GetParameterCommand({ Name: name, WithDecryption: true })
  );

  console.log(`  Name:  ${result.Parameter?.Name}`);
  console.log(`  Value: ${result.Parameter?.Value}`);
  console.log(`  Type:  ${result.Parameter?.Type}\n`);
}

async function getParametersByPath(): Promise<void> {
  console.log(`Getting all parameters under '${PARAM_PATH}'...\n`);

  const result = await ssmClient.send(
    new GetParametersByPathCommand({
      Path: PARAM_PATH,
      Recursive: true,
      WithDecryption: true,
    })
  );

  for (const param of result.Parameters ?? []) {
    const display = param.Type === "SecureString" ? "***" : param.Value;
    console.log(`  ${param.Name} = ${display} (${param.Type})`);
  }

  console.log();
}

async function deleteParameters(): Promise<void> {
  console.log("Cleaning up — deleting parameters...");

  for (const param of PARAMETERS) {
    await ssmClient.send(new DeleteParameterCommand({ Name: param.name }));
    console.log(`  [DELETED] ${param.name}`);
  }
}

async function main(): Promise<void> {
  await putParameters();
  await getParameter();
  await getParametersByPath();
  await deleteParameters();
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
