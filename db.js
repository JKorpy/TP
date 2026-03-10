// Configure and export a PostgreSQL connection pool using the DATABASE_URL from the .env file
// This is kept in a separate file so the same database connection can be reused
// across the application without duplicating configuration code.
require("dotenv").config();
const dns = require("dns");
dns.setDefaultResultOrder("ipv4first");

const { Pool } = require("pg");

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  ssl: {
    rejectUnauthorized: false
  }
});

module.exports = { pool };
