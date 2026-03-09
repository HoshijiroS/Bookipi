/**
 * @type {import('node-pg-migrate').MigrationBuilder}
 */

exports.up = (pgm) => {  // Seed a single flash sale product row (you can adjust values later)
  pgm.sql(`
    UPDATE flash_sale_product
    SET stock = 99
  `);
};

