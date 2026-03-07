import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerS3Tools } from "./tools/s3.js";
import { registerSqsTools } from "./tools/sqs.js";
import { registerSnsTools } from "./tools/sns.js";
import { registerEventBridgeTools } from "./tools/eventbridge.js";
import { registerKinesisTools } from "./tools/kinesis.js";
import { registerDynamoDBTools } from "./tools/dynamodb.js";
import { registerLambdaTools } from "./tools/lambda.js";
import { registerSecretsManagerTools } from "./tools/secretsmanager.js";
import { registerSsmTools } from "./tools/ssm.js";
import { registerSesTools } from "./tools/ses.js";

const server = new McpServer({
  name: "localstack-mcp",
  version: "0.1.0",
});

registerS3Tools(server);
registerSqsTools(server);
registerSnsTools(server);
registerEventBridgeTools(server);
registerKinesisTools(server);
registerDynamoDBTools(server);
registerLambdaTools(server);
registerSecretsManagerTools(server);
registerSsmTools(server);
registerSesTools(server);

const transport = new StdioServerTransport();
await server.connect(transport);
