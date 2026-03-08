/**
 * @type {import('node-pg-migrate').MigrationBuilder}
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable("orders", {
    id: "id",
    user_id: { type: "text", notNull: true },
    status: { type: "text", notNull: true, default: "pending" },
    created_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") }
  });

  pgm.sql(
    "ALTER TABLE orders ADD CONSTRAINT orders_status_check CHECK (status IN ('pending','completed','cancelled'))"
  );

  pgm.sql("CREATE UNIQUE INDEX one_purchase_per_user ON orders (user_id) WHERE status = 'completed'");

  pgm.createTable("order_items", {
    id: "id",
    order_id: {
      type: "bigint",
      notNull: true,
      references: "orders",
      onDelete: "CASCADE"
    },
    product_id: { type: "text", notNull: true },
    quantity: { type: "integer", notNull: true, default: 1 },
    price_cents: { type: "integer", notNull: true }
  });

  pgm.sql("ALTER TABLE order_items ADD CONSTRAINT single_quantity CHECK (quantity = 1)");
  pgm.addConstraint("order_items", "order_items_unique_product_per_order", {
    unique: ["order_id", "product_id"]
  });
};

exports.down = (pgm) => {
  pgm.dropTable("order_items");
  pgm.dropTable("orders");
};

