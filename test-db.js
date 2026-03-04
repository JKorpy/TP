const { pool } = require("./db");

(async () => {
  try {
    const result = await pool.query("SELECT NOW()");
    console.log(" Connected:", result.rows[0]);
  } catch (err) {
    console.error(" Error:", err.message);
  } finally {
    await pool.end();
  }
})();