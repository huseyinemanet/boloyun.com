import assert from "node:assert/strict";
import test from "node:test";
import { moveItemById, orderItemsById } from "./category-order";

const categories = [
  { id: "a", name: "A" },
  { id: "b", name: "B" },
  { id: "c", name: "C" },
];

test("moveItemById moves a dragged category to the hovered position", () => {
  assert.deepEqual(moveItemById(categories, "a", "c").map((item) => item.id), ["b", "c", "a"]);
  assert.deepEqual(moveItemById(categories, "c", "a").map((item) => item.id), ["c", "a", "b"]);
});

test("moveItemById leaves the list unchanged for an unknown category", () => {
  assert.equal(moveItemById(categories, "missing", "a"), categories);
});

test("orderItemsById restores the last persisted order", () => {
  assert.deepEqual(orderItemsById(categories, ["c", "a", "b"]).map((item) => item.id), ["c", "a", "b"]);
});
