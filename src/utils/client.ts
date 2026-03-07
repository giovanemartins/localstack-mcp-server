import { S3Client } from "@aws-sdk/client-s3";
import { SNSClient } from "@aws-sdk/client-sns";
import { SQSClient } from "@aws-sdk/client-sqs";
import { EventBridgeClient } from "@aws-sdk/client-eventbridge";
import { KinesisClient } from "@aws-sdk/client-kinesis";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { LambdaClient } from "@aws-sdk/client-lambda";
import { SecretsManagerClient } from "@aws-sdk/client-secrets-manager";
import { SSMClient } from "@aws-sdk/client-ssm";
import { SESClient } from "@aws-sdk/client-ses";
import { config } from "../config.js";

const clientConfig = {
  endpoint: config.endpoint,
  region: config.region,
  credentials: config.credentials,
  forcePathStyle: true,
};

export const s3Client = new S3Client(clientConfig);
export const sqsClient = new SQSClient(clientConfig);
export const snsClient = new SNSClient(clientConfig);
export const eventBridgeClient = new EventBridgeClient(clientConfig);
export const kinesisClient = new KinesisClient(clientConfig);

const dynamoBaseClient = new DynamoDBClient(clientConfig);
export const dynamoClient = DynamoDBDocumentClient.from(dynamoBaseClient);
export const dynamoRawClient = dynamoBaseClient;
export const lambdaClient = new LambdaClient(clientConfig);
export const secretsManagerClient = new SecretsManagerClient(clientConfig);
export const ssmClient = new SSMClient(clientConfig);
export const sesClient = new SESClient(clientConfig);
