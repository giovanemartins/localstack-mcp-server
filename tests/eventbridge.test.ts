import {
  CreateEventBusCommand,
  DeleteEventBusCommand,
  DeleteRuleCommand,
  DescribeRuleCommand,
  DisableRuleCommand,
  EnableRuleCommand,
  EventBridgeClient,
  ListEventBusesCommand,
  ListRulesCommand,
  ListTargetsByRuleCommand,
  PutEventsCommand,
  PutRuleCommand,
  PutTargetsCommand,
  RemoveTargetsCommand,
} from "@aws-sdk/client-eventbridge";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { config } from "../src/config.js";

const client = new EventBridgeClient({
  endpoint: config.endpoint,
  region: config.region,
  credentials: config.credentials,
});

const BUS_NAME = `test-bus-${Date.now()}`;
const RULE_NAME = `test-rule-${Date.now()}`;

beforeAll(async () => {
  await client.send(new CreateEventBusCommand({ Name: BUS_NAME }));
});

afterAll(async () => {
  await client.send(
    new RemoveTargetsCommand({ Rule: RULE_NAME, EventBusName: BUS_NAME, Ids: ["target-1"] })
  ).catch(() => {});
  await client.send(
    new DeleteRuleCommand({ Name: RULE_NAME, EventBusName: BUS_NAME })
  ).catch(() => {});
  await client.send(new DeleteEventBusCommand({ Name: BUS_NAME }));
});

describe("EventBridge — list buses", () => {
  it("returns the test bus in the list", async () => {
    const result = await client.send(new ListEventBusesCommand({ NamePrefix: BUS_NAME }));
    const names = (result.EventBuses ?? []).map((b) => b.Name);
    expect(names).toContain(BUS_NAME);
  });
});

describe("EventBridge — create & delete bus", () => {
  const ephemeralBus = `ephemeral-bus-${Date.now()}`;

  it("creates a bus successfully", async () => {
    const result = await client.send(new CreateEventBusCommand({ Name: ephemeralBus }));
    expect(result.EventBusArn).toBeDefined();
  });

  it("deletes the bus successfully", async () => {
    await expect(
      client.send(new DeleteEventBusCommand({ Name: ephemeralBus }))
    ).resolves.toBeDefined();
  });
});

describe("EventBridge — rules", () => {
  it("creates a rule with an event pattern", async () => {
    const result = await client.send(
      new PutRuleCommand({
        Name: RULE_NAME,
        EventBusName: BUS_NAME,
        EventPattern: JSON.stringify({ source: ["myapp.test"] }),
        State: "ENABLED",
      })
    );
    expect(result.RuleArn).toBeDefined();
  });

  it("lists rules on the bus", async () => {
    const result = await client.send(
      new ListRulesCommand({ EventBusName: BUS_NAME })
    );
    const names = (result.Rules ?? []).map((r) => r.Name);
    expect(names).toContain(RULE_NAME);
  });

  it("describes the rule", async () => {
    const result = await client.send(
      new DescribeRuleCommand({ Name: RULE_NAME, EventBusName: BUS_NAME })
    );
    expect(result.Name).toBe(RULE_NAME);
    expect(result.State).toBe("ENABLED");
  });

  it("disables the rule", async () => {
    await client.send(new DisableRuleCommand({ Name: RULE_NAME, EventBusName: BUS_NAME }));
    const result = await client.send(
      new DescribeRuleCommand({ Name: RULE_NAME, EventBusName: BUS_NAME })
    );
    expect(result.State).toBe("DISABLED");
  });

  it("re-enables the rule", async () => {
    await client.send(new EnableRuleCommand({ Name: RULE_NAME, EventBusName: BUS_NAME }));
    const result = await client.send(
      new DescribeRuleCommand({ Name: RULE_NAME, EventBusName: BUS_NAME })
    );
    expect(result.State).toBe("ENABLED");
  });
});

describe("EventBridge — targets", () => {
  const targetArn = `arn:aws:sqs:us-east-1:000000000000:dummy-queue`;

  it("adds a target to the rule", async () => {
    const result = await client.send(
      new PutTargetsCommand({
        Rule: RULE_NAME,
        EventBusName: BUS_NAME,
        Targets: [{ Id: "target-1", Arn: targetArn }],
      })
    );
    expect(result.FailedEntryCount).toBe(0);
  });

  it("lists targets for the rule", async () => {
    const result = await client.send(
      new ListTargetsByRuleCommand({ Rule: RULE_NAME, EventBusName: BUS_NAME })
    );
    const ids = (result.Targets ?? []).map((t) => t.Id);
    expect(ids).toContain("target-1");
  });

  it("removes the target", async () => {
    const result = await client.send(
      new RemoveTargetsCommand({ Rule: RULE_NAME, EventBusName: BUS_NAME, Ids: ["target-1"] })
    );
    expect(result.FailedEntryCount).toBe(0);
  });
});

describe("EventBridge — put events", () => {
  it("puts a custom event onto the bus", async () => {
    const result = await client.send(
      new PutEventsCommand({
        Entries: [
          {
            Source: "myapp.test",
            DetailType: "TestEvent",
            Detail: JSON.stringify({ key: "value" }),
            EventBusName: BUS_NAME,
          },
        ],
      })
    );
    expect(result.FailedEntryCount).toBe(0);
  });
});
