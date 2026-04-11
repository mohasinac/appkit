import fs from "node:fs";
import path from "node:path";

const distRoot = path.resolve("dist");
const directive = '"use client";\n';

const clientEntries = [
  "react/index",
  "ui/index",
  "features/layout/index",
  "features/forms/index",
  "features/filters/index",
  "features/media/index",
  "features/auth/index",
  "features/account/index",
  "features/admin/index",
  "features/cms/index",
  "features/blog/index",
  "features/cart/index",
  "features/categories/index",
  "features/checkout/index",
  "features/collections/index",
  "features/consultation/index",
  "features/corporate/index",
  "features/events/index",
  "features/faq/index",
  "features/homepage/index",
  "features/loyalty/index",
  "features/orders/index",
  "features/payments/index",
  "features/products/index",
  "features/promotions/index",
  "features/reviews/index",
  "features/search/index",
  "features/seller/index",
  "features/stores/index",
  "features/wishlist/index",
  "features/auctions/index",
  "features/pre-orders/index",
  "features/before-after/index",
  "features/whatsapp-bot/index",
  "features/about/index",
  "features/contact/index",
  "features/copilot/index",
];

function ensureDirective(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, "utf8");
  if (content.startsWith(directive)) return;
  fs.writeFileSync(filePath, directive + content, "utf8");
}

for (const entry of clientEntries) {
  ensureDirective(path.join(distRoot, `${entry}.js`));
  ensureDirective(path.join(distRoot, `${entry}.cjs`));
}

console.log("Preserved client directives in dist client entries.");
