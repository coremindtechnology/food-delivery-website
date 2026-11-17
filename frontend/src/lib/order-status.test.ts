import assert from "node:assert/strict";
import test from "node:test";
import { isValidOrderTransition, normalizeOrderStatus } from "./order-status";

test("order transitions follow the server-side state graph", () => {
  assert.equal(isValidOrderTransition("pending_payment", "new"), true);
  assert.equal(isValidOrderTransition("new", "accepted"), true);
  assert.equal(isValidOrderTransition("accepted", "preparing"), true);
  assert.equal(isValidOrderTransition("preparing", "ready"), true);
  assert.equal(isValidOrderTransition("ready", "dispatched"), true);
  assert.equal(isValidOrderTransition("dispatched", "delivered"), true);
  assert.equal(isValidOrderTransition("pending_payment", "delivered"), false);
  assert.equal(isValidOrderTransition("delivered", "cancelled"), false);
  assert.equal(isValidOrderTransition("rejected", "accepted"), false);
});

test("legacy persisted order statuses normalize without changing the new state model", () => {
  assert.equal(normalizeOrderStatus("placed"), "new");
  assert.equal(normalizeOrderStatus("confirmed"), "accepted");
  assert.equal(normalizeOrderStatus("out_for_delivery"), "dispatched");
  assert.equal(normalizeOrderStatus("unknown"), null);
});
