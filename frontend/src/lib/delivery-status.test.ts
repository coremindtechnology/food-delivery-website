import assert from "node:assert/strict";
import test from "node:test";
process.env.DELIVERY_CODE_SECRET = "unit-delivery-code-secret-1234567890";
import {
  calculateCodCollection,
  canDeliveryPersonnelAct,
  generateDeliveryConfirmationCode,
  hashDeliveryConfirmationCode,
  ownsDeliveryAssignment,
  verifyDeliveryConfirmationCode,
} from "./delivery-status";

test("delivery actions require their preceding assignment state", () => {
  assert.equal(canDeliveryPersonnelAct("assigned", "pickup_confirm"), true);
  assert.equal(canDeliveryPersonnelAct("assigned", "en_route"), false);
  assert.equal(canDeliveryPersonnelAct("picked_up", "en_route"), true);
  assert.equal(canDeliveryPersonnelAct("en_route", "en_route"), true);
  assert.equal(canDeliveryPersonnelAct("picked_up", "delivered"), false);
  assert.equal(canDeliveryPersonnelAct("en_route", "delivered"), true);
  assert.equal(canDeliveryPersonnelAct("delivered", "failed"), false);
  assert.equal(ownsDeliveryAssignment("rider-1", "rider-1"), true);
  assert.equal(ownsDeliveryAssignment("rider-1", "rider-2"), false);
});

test("delivery confirmation codes are single-order six-digit proofs", () => {
  const code = generateDeliveryConfirmationCode();
  assert.match(code, /^\d{6}$/);
  const hash = hashDeliveryConfirmationCode(code);
  assert.equal(verifyDeliveryConfirmationCode(code, hash), true);
  assert.equal(verifyDeliveryConfirmationCode("000000", hash), code === "000000");
  assert.equal(verifyDeliveryConfirmationCode("abc123", hash), false);
});

test("COD collection tracks partial and complete amounts without allowing oversettlement", () => {
  assert.deepEqual(calculateCodCollection(500, 0, 125.5), {
    collected: 125.5,
    outstanding: 374.5,
  });
  assert.deepEqual(calculateCodCollection(374.5, 125.5, 374.5), {
    collected: 500,
    outstanding: 0,
  });
  assert.equal(calculateCodCollection(50, 0, 50.01), null);
  assert.equal(calculateCodCollection(50, 0, Number.NaN), null);
});
