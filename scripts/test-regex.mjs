const text = `export {
  subscribeNewsletter,
  type SubscribeNewsletterActionInput,
  type SupportedNewsletterSource,
} from './newsletter-actions';`;
const m = [
  ...text.matchAll(
    /^export\s+(?:type\s+)?\{([^}]+)\}(?:\s+from\s+['"][^'"]+['"])?/gm,
  ),
];
console.log("matches:", m.length);
if (m[0]) {
  const parts = m[0][1].split(",");
  for (const p of parts) {
    const isType = /^\s*type\s+/.test(p);
    const name = p
      .trim()
      .replace(/^type\s+/, "")
      .split(/\s+as\s+/)
      .pop()
      .trim();
    console.log(JSON.stringify(name), "isType:", isType);
  }
}
