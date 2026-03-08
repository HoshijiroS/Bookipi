require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const { createRateLimiter } = require("./middleware/rateLimiter");
const productRoutes = require("./routes/product");
const checkoutRoutes = require("./routes/checkout");
const flashSaleRoutes = require("./routes/flashSale");

const PORT = Number(process.env.PORT) || 3001;
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:5173";

const app = express();

app.use(helmet());
app.use(cors({ origin: CORS_ORIGIN }));
app.use(morgan("dev"));
app.use(express.json({ limit: "50kb" }));
app.use(createRateLimiter());

app.use("/api/products", productRoutes);
app.use("/api/checkout", checkoutRoutes);
app.use("/api/flash-sale", flashSaleRoutes);

app.use((req, res) => res.status(404).json({ error: "not_found" }));

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});

