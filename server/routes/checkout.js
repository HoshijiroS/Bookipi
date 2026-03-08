const express = require("express");
const { withClient } = require("../db");
const {
  listProducts,
  priceForItems,
  reserveStock,
  validateAndNormalizeItems,
  getProduct
} = require("../services/stockService");

const router = express.Router();

router.post("/", async (req, res) => {
  const userId = typeof req.body?.userId === "string" ? req.body.userId.trim() : "";
  if (!userId) return res.status(400).json({ error: "userId is required" });

  const normalized = validateAndNormalizeItems(req.body?.items);
  if (!normalized.ok) return res.status(400).json({ error: normalized.error });

  const priced = priceForItems(normalized.items);
  if (!priced.ok) return res.status(400).json({ error: priced.error });

  const reserved = await reserveStock(normalized.items);
  if (!reserved.ok) return res.status(409).json({ error: reserved.error });

  try {
    const result = await withClient(async (client) => {
      await client.query("BEGIN");
      try {
        const orderInsert = await client.query(
          "INSERT INTO orders (user_id, status) VALUES ($1, 'completed') RETURNING id, user_id, status, created_at",
          [userId]
        );
        const order = orderInsert.rows[0];

        for (const item of normalized.items) {
          const product = getProduct(item.productId);
          await client.query(
            "INSERT INTO order_items (order_id, product_id, quantity, price_cents) VALUES ($1, $2, $3, $4)",
            [order.id, item.productId, item.quantity, product.priceCents]
          );
        }

        await client.query("COMMIT");
        return { order };
      } catch (e) {
        await client.query("ROLLBACK");
        throw e;
      }
    });

    const products = await listProducts();

    return res.status(201).json({
      ok: true,
      totalCents: priced.totalCents,
      order: result.order,
      products
    });
  } catch (e) {
    // Unique index one_purchase_per_user violation
    if (e?.code === "23505") {
      return res.status(409).json({ error: "user already has a completed order" });
    }
    // CHECK constraint single_quantity violation
    if (e?.code === "23514") {
      return res.status(400).json({ error: "quantity must be 1" });
    }
    return res.status(500).json({ error: "internal_error" });
  }
});

module.exports = router;

