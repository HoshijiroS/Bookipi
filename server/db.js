const { Pool } = require("pg");

let pool;

function getPool() {
  console.log("get pool running");
  if (!pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is required");
    }
    pool = new Pool({ connectionString: 'postgresql://bookipi:bookipi@localhost:5432/bookipi' });
  }
  return pool;
}

async function withClient(fn) {
  const client = await getPool().connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
}

module.exports = { getPool, withClient };

