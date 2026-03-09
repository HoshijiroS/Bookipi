const express = require("express");
const { getProduct, listProducts, restockProduct } = require("../services/stockService");

const router = express.Router();

router.get("/", async (req, res) => {
  const products = await listProducts();
  res.json({ products });
});

router.get("/:id", async (req, res) => {
  const product = await getProduct(req.params.id);
  if (!product) return res.status(404).json({ error: "not_found" });
  return res.json({ product });
});

router.post("/restock", async (req, res) => {
  const result = await restockProduct(req.body.productId);
  res.json({ result });
})

module.exports = router;

