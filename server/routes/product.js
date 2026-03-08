const express = require("express");
const { getProduct, listProducts } = require("../services/stockService");

const router = express.Router();

router.get("/", async (req, res) => {
  const products = await listProducts();
  res.json({ products });
});

router.get("/:id", (req, res) => {
  const product = getProduct(req.params.id);
  if (!product) return res.status(404).json({ error: "not_found" });
  return res.json({ product });
});

module.exports = router;

