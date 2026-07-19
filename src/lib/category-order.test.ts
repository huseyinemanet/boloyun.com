import assert from "node:assert/strict";
import test from "node:test";
import { groupSidebarCategories, moveItemById, orderItemsById } from "./category-order";

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

test("groupSidebarCategories keeps visible categories above hidden categories", () => {
  const mixed = [
    { id: "a", show_in_sidebar: false },
    { id: "b", show_in_sidebar: true },
    { id: "c", show_in_sidebar: false },
    { id: "d", show_in_sidebar: true },
  ];

  assert.deepEqual(groupSidebarCategories(mixed).map((item) => item.id), ["b", "d", "a", "c"]);
});

test("groupSidebarCategories puts the newly enabled category at the end of the visible group", () => {
  const toggled = [
    { id: "a", show_in_sidebar: true },
    { id: "b", show_in_sidebar: true },
    { id: "c", show_in_sidebar: false },
  ];

  assert.deepEqual(groupSidebarCategories(toggled, "a").map((item) => item.id), ["b", "a", "c"]);
});
