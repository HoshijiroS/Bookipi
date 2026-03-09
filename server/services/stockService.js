const { withClient } = require("../db");
const { getRedis } = require("../redisClient");

async function getCatalogFromDatabase() {
  const result = await withClient(async (client) => {
    try {
      const products = await client.query(
        "SELECT id, sku, name, price_cents, stock, created_at FROM flash_sale_product FOR UPDATE"
      );

      if (products.rows.length === 0) {
        return [];
      }

      return products.rows.map((row) => ({
        id: row.id,
        name: row.name,
        priceCents: row.price_cents,
        stock: row.stock
      }));
    } catch (e) {
      throw e;
    }
  });

  return result;
}

async function getProductMeta(productId) {
  const catalog = await getCatalogFromDatabase();

  return catalog.find((p) => p.id === productId) || null;
}

async function ensureStockKey(client, productId) {
  const meta = await getProductMeta(productId);
  if (!meta) return null;
  const key = `stock:${productId}`;
  // Only set if not exists, so we don't overwrite existing stock
  await client.setNX(key, String(meta.stock));
  const raw = await client.get(key);

  return { meta, stock: Number(raw ?? meta.stock) };
}

async function restockProduct(productId) {
  const result = await withClient(async (client) => {
    try {
      return client.query(
        "UPDATE flash_sale_product SET stock = 99 WHERE id = $1", [productId]
      );
    } catch (e) {
      throw e;
    }
  });

  if (result.rowCount === 0) {
    return { ok: false, error: "stocks not updated" };
  }

  return { ok: true, items: await getCatalogFromDatabase() };
}

async function listProducts() {
  const client = await getRedis();

  const catalog = await getCatalogFromDatabase();

  const result = [];

  for (const meta of catalog) {
    const key = `stock:${meta.id}`;
    await client.setNX(key, String(meta.stock));
    const raw = await client.get(key);

    result.push({
      id: meta.id,
      name: meta.name,
      priceCents: meta.priceCents,
      stock: Number(raw ?? meta.stock)
    });
  }

  return result;
}

async function getProduct(productId) {
  const meta = await getProductMeta(productId);
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

async function priceForItems(items) {
  let totalCents = 0;
  for (const { productId, quantity } of items) {
    const product = await getProductMeta(productId);
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
  reserveStock,
  restockProduct,
};

