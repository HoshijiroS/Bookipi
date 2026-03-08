/**
 * @type {import('node-pg-migrate').MigrationBuilder}
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // Single flash sale product stored in Postgres
  pgm.createTable("flash_sale_product", {
    id: "bigserial",
    sku: { type: "text", notNull: true, unique: true },
    name: { type: "text", notNull: true },
    price_cents: { type: "integer", notNull: true },
    stock: { type: "integer", notNull: true, default: 0 },
    created_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") }
  });

  // Seed a single flash sale product row (you can adjust values later)
  pgm.sql(`
    INSERT INTO flash_sale_product (sku, name, price_cents, stock)
    VALUES ('flash-1', 'Flash Sale Product', 999, 0)
  `);
};

exports.down = (pgm) => {
  pgm.dropTable("flash_sale_product");
};

