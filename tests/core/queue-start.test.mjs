import test from "node:test";
import assert from "node:assert/strict";
import { Queue } from "../../dist/core/index.js";

test("Queue.start runs tasks from lowest priority first", async () => {
  const queue = new Queue({ autoStart: false, concurrency: 1 });
  const executionOrder = [];

  queue.add(
    "tier-3",
    async () => {
      executionOrder.push("tier-3");
      return "tier-3";
    },
    3,
  );
  queue.add(
    "tier-1",
    async () => {
      executionOrder.push("tier-1");
      return "tier-1";
    },
    1,
  );
  queue.add(
    "tier-2",
    async () => {
      executionOrder.push("tier-2");
      return "tier-2";
    },
    2,
  );

  assert.equal(queue.getRunning(), 0);
  assert.equal(queue.size(), 3);

  queue.start();
  await queue.waitForCompletion();

  assert.deepEqual(executionOrder, ["tier-1", "tier-2", "tier-3"]);
  assert.equal(queue.getResult("tier-1"), "tier-1");
  assert.equal(queue.getResult("tier-2"), "tier-2");
  assert.equal(queue.getResult("tier-3"), "tier-3");
});
