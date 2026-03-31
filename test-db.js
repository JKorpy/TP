//Necessary to collect database credentials
require("dotenv").config();
//Opens database connection
const { pool } = require("./model/db");
//Get queries
const productQuery = require("./public/js/queries");
//Get product
const products = require("./products.json");

const insert = async () => {

    const client = await pool.connect();

    try {
        // BEGIN
        await client.query(`BEGIN`);
        console.log("Transaction started");
        // //Delete Table
        // await productQuery.dropTable(client);
        // console.log("Dropped products table");

        //Create Table
        await productQuery.createTable(client);
        console.log("Created products table");


        //Insert into Table
        for(const product of products) {
            await productQuery.addAllProducts(client, product);
        }
        console.log("Inserted products into products table");

        // Commit
        await client.query(`COMMIT`);
        console.log("Transaction commited");

        //Test query
        const result = await productQuery.getAllProducts(client);
        //Very handy console table
        console.table(result);
        const res = await pool.query('SELECT current_database(), inet_server_addr();');
        console.log(res.rows); 
        }
    catch(err) {
        // ROLLBACK
        await client.query('ROLLBACK');
        console.error("Failed to SQL", err)
        console.log()
    }
    finally {
        //Close database connection
        client.release();
        await pool.end();
    }
}

//Execute
insert();
