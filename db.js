// Configure and export a PostgreSQL connection pool using the DATABASE_URL from the .env file
// This is kept in a separate file so the same database connection can be reused
// across the application without duplicating configuration code.
require("dotenv").config();
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

module.exports = { pool };
