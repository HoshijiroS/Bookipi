const { getRedis } = require("../redisClient");

const CATALOG = [
  { id: "p1", name: "Electric Scooter", priceCents: 499, defaultStock: 30 }
];

function getProductMeta(productId) {
  return CATALOG.find((p) => p.id === productId) || null;
}

async function ensureStockKey(client, productId) {
  const meta = getProductMeta(productId);
  if (!meta) return null;
  const key = `stock:${productId}`;
  // Only set if not exists, so we don't overwrite existing stock
  await client.setNX(key, String(meta.defaultStock));
  const raw = await client.get(key);
  return { meta, stock: Number(raw ?? meta.defaultStock) };
}

async function listProducts() {
  const client = await getRedis();
  const result = [];
  for (const meta of CATALOG) {
    const key = `stock:${meta.id}`;
    await client.setNX(key, String(meta.defaultStock));
    const raw = await client.get(key);
    result.push({
      id: meta.id,
      name: meta.name,
      priceCents: meta.priceCents,
      stock: Number(raw ?? meta.defaultStock)
    });
  }
  return result;
}

function getProduct(productId) {
  const meta = getProductMeta(productId);
  return meta ? { id: meta.id, name: meta.name, priceCents: meta.priceCents } : null;
}

function validateAndNormalizeItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return { ok: false, error: "items must be a non-empty array" };
  }

  const normalized = [];
  for (const raw of items) {
    const productId = typeof raw?.productId === "string" ? raw.productId.trim() : "";
    const quantity = Number(raw?.quantity);

    if (!productId) return { ok: false, error: "each item requires productId" };
    if (!Number.isInteger(quantity) || quantity !== 1) {
      return { ok: false, error: "each item quantity must be 1" };
    }

    normalized.push({ productId, quantity });
  }

  return { ok: true, items: normalized };
}

function priceForItems(items) {
  let totalCents = 0;
  for (const { productId, quantity } of items) {
    const product = getProductMeta(productId);
    if (!product) return { ok: false, error: `unknown productId: ${productId}` };
    totalCents += product.priceCents * quantity;
  }
  return { ok: true, totalCents };
}

async function reserveStock(items) {
  const client = await getRedis();

  // Check availability
  for (const { productId, quantity } of items) {
    const info = await ensureStockKey(client, productId);
    if (!info) return { ok: false, error: `unknown productId: ${productId}` };
    if (info.stock < quantity) {
      return { ok: false, error: `insufficient stock for ${productId}` };
    }
  }

  // Deduct stock (non-atomically for simplicity; good enough for demo)
  for (const { productId, quantity } of items) {
    const key = `stock:${productId}`;
    await client.decrBy(key, quantity);
  }

  return { ok: true };
}

module.exports = {
  listProducts,
  getProduct,
  validateAndNormalizeItems,
  priceForItems,
  reserveStock
};

