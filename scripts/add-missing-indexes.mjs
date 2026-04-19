import { readFileSync, writeFileSync } from "fs";

const filePath = "./firebase/base/firestore.indexes.json";
const content = readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
const f = JSON.parse(content);

const newIndexes = [
  // products - auction
  {
    collectionGroup: "products",
    queryScope: "COLLECTION",
    fields: [
      { fieldPath: "isAuction", order: "ASCENDING" },
      { fieldPath: "reservePrice", order: "DESCENDING" },
    ],
  },
  {
    collectionGroup: "products",
    queryScope: "COLLECTION",
    fields: [
      { fieldPath: "status", order: "ASCENDING" },
      { fieldPath: "auctionEndDate", order: "DESCENDING" },
    ],
  },
  // products - preorder
  {
    collectionGroup: "products",
    queryScope: "COLLECTION",
    fields: [
      { fieldPath: "isPreOrder", order: "ASCENDING" },
      { fieldPath: "preOrderDepositAmount", order: "DESCENDING" },
    ],
  },
  {
    collectionGroup: "products",
    queryScope: "COLLECTION",
    fields: [
      { fieldPath: "status", order: "ASCENDING" },
      { fieldPath: "preOrderDeliveryDate", order: "DESCENDING" },
    ],
  },
  // events
  {
    collectionGroup: "events",
    queryScope: "COLLECTION",
    fields: [
      { fieldPath: "type", order: "ASCENDING" },
      { fieldPath: "stats.totalEntries", order: "DESCENDING" },
    ],
  },
  // blogPosts
  {
    collectionGroup: "blogPosts",
    queryScope: "COLLECTION",
    fields: [
      { fieldPath: "isFeatured", order: "ASCENDING" },
      { fieldPath: "status", order: "ASCENDING" },
      { fieldPath: "updatedAt", order: "DESCENDING" },
    ],
  },
];

f.indexes.push(...newIndexes);
writeFileSync(filePath, JSON.stringify(f, null, 2), "utf8");
console.log("Total indexes:", f.indexes.length);
console.log("Done");
