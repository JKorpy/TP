const { pool } = require("../../model/db");

//https://node-postgres.com/apis/result

const queries = {

    // ######################
    //  Login Page 
    // ######################    

    //Drop table
    dropTable: async (client) => {
        await client.query(`DROP TABLE IF EXISTS products`)
    },

    //Create Table
    createTable: async (client) => {
        await client.query(`
            CREATE TABLE IF NOT EXISTS public.products (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255),
                category VARCHAR(255),
                price NUMERIC(10, 2),
                description VARCHAR(255)
            );
        `);    
    },

    //Create User Table
    createUserTable: async (client) => {
        await client.query(`
            CREATE TABLE IF NOT EXISTS public.products (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255),
                category VARCHAR(255),
                price NUMERIC(10, 2),
                description VARCHAR(255)
            );
        `);    
    },  

    //Create Basket Table
    createListsTable: async (client) => {
        await client.query(`
            CREATE TABLE IF NOT EXISTS public.lists (
                id SERIAL PRIMARY KEY,
                user_id INT REFERENCES users(id),
                product_id INT REFERENCES products(id),
                quantity INT DEFAULT 1,
                UNIQUE (user_id, product_id)
            )
        `);    
    },      
    
    

    //Get all products
    getAllProducts: async (client) => {
        const result = await client.query(`
           SELECT id, name, category, price, description FROM public.products 
        `);
        return result.rows
    },

    //Add product JSON to PostgreSQL
    addAllProducts: async (client, product) => {
        await client.query(`
            INSERT INTO public.products (id, name, category, price, description)
            VALUES ($1, $2, $3, $4, $5)`,
            [product.id, product.name, product.category, product.price, product.description]    
        );
    },

    // ######################
    //  Catalogue Page 
    // ######################        

    //Get products for comparison
    getComparedProducts: async (client, product) => {
        const result = await client.query(`
            SELECT category FROM public.products
            WHERE id != $1
            AND category = $2
            ORDER BY price ASC
            LIMIT 10`,
            [product.id, product.category]);
        return result.rows;
    },  
    
    //Get products in ascending order
    getAscending: async (client, product) => {
        const result = await client.query(`
            SELECT category FROM public.products
            WHERE id != $1
            AND category = $2
            ORDER BY price ASC
            LIMIT 10`,
            [product.id, product.category]);
        return result.rows;
    },       

    //Search product by id
    searchById: async (client, id) => {
        const result = await client.query(`
            SELECT id, name, cateogry, price, description FROM public.products
            WHERE id = $1`, 
            [id]);
        return result.rows[0];
    },

    //get catalogue
    getCatalogue: async (client ,{search, categoryFilter, orderBy, limit, offset}) => {
        //Dynamic WHERE clause
        const conditions = [`name LIKE $1`];
        const values = [`%${search}%`];        
        
        //Add category as an extra condition
        //values = [`%%`, `Food`], $values.length = $2
        if(categoryFilter) {
            values.push(categoryFilter);
            conditions.push(`category = $${values.length}`);
        }    

        //Finalise the WHERE, Order By, & Offset & Limit clauses
        //"WHERE name ILIKE $1 AND category = $2"
        const whereClause = `WHERE ${conditions.join(" AND ")}`;
        //"ORDER BY name ASC"
        const orderByClause = `ORDER BY ${orderBy}`;
        //if values has 2 items => LIMIT $3 OFFSET $4
        const pagination = `LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;
        
        //Run both queries at once with Promise.all
        const [productsResult, countResult] = await Promise.all([
            //Fetch the filtered, sorted and paginated products based on the current page
            client.query(`SELECT * FROM products ${whereClause} ${orderByClause} ${pagination}`, [...values, limit, offset]),
            //Count all matching products across all pages with filters
            client.query(`SELECT COUNT(*) FROM products ${whereClause}`, values)
        ]);
        //Output
        return {
            products: productsResult.rows,
            totalProducts: parseInt(countResult.rows[0].count)
        };
    },

    //Get unqique categories
    getUniqueCategories: async (client) => {
        const result = await client.query(`
            SELECT DISTINCT category FROM public.products ORDER BY category ASC`
        );
        //Extracts category string from each row object
        return result.rows.map(row => row.category);
    },

    //Fetch a single product and the 10 cheapest products within the same category
    getComparison: async (client, id) => {
        //
        const getAllByID = `SELECT * FROM products WHERE id = $1`;
        const productResult = await client.query(getAllByID, [id]);

        //Get the first product
        const product = productResult.rows[0];

        //Apply comparison filter
        const getComparisonFilter = `SELECT * FROM products WHERE category = $1 AND id != $2 ORDER BY price ASC LIMIT 10`;
        const filterResult = await client.query(getComparisonFilter, [product.category, id]);
        const filtered = filterResult.rows;
        //Output
        return {product, filtered };
    },

    addToShoppingList: async (client, {userId, productId}) => {
        await client.query(`
            INSERT INTO lists (user_id, product_id, quantity)
            VALUES ($1, $2, 1)
            ON CONFLICT (user_id, product_id)
            DO UPDATE SET quantity = lists.quantity + 1`,
            [userId, productId]
        );
    },
  
    // ######################
    //  List Page 
    // ######################

    getShoppingList: async (client, userId) => {
        const result = await client.query(`
            SELECT l.id, p.name, p.description, l.quantity, (l.quantity * p.price)::numeric as total
            FROM lists l
            JOIN products p ON l.product_id = p.id
            WHERE l.user_id = $1
            ORDER BY p.name ASC
            `,[userId]
        );
        return result.rows
    },

    removeFromShoppingList: async (client, {userId, listId}) => {
        await client.query(`
            DELETE FROM lists
            WHERE user_id = $1 AND id = $2`,
            [userId, listId]
        );
    },

    updateFromShoppingList: async (client, {userId, listId, quantity}) => {
        await client.query(`
            UPDATE lists SET quantity = $1
            WHERE user_id = $2 AND id = $3`,
            [quantity, userId, listId]
        );
    },
    
    // ######################
    //  Home Page 
    // ######################
    getFeaturedProducts: async (client) => {
        const result = await client.query(`
            SELECT name, description, price FROM products
            ORDER BY RANDOM()
            LIMIT 8`
        );
        return result.rows
    },

    // ######################
    //  Login Page 
    // ######################
    getUser: async (client, userId) => {
        const result = await client.query(
            "SELECT * FROM users WHERE id = $1",
            [userId]
        );        
        return result.rows[0];
    },

    // ######################
    //  Profile Page 
    // ######################
    updateUser: async(client, updatedUser) => {
        await client.query(`
        UPDATE users
        SET first_name = $1,
            last_name = $2,
            username = $3,
            email = $4,
            phone = $5,
            date_of_birth = $6,
            password_hash = $7
        WHERE id = $8`,
        [
            updatedUser.first_name,
            updatedUser.last_name,
            updatedUser.username,
            updatedUser.email,
            updatedUser.phone,
            updatedUser.date_of_birth,
            updatedUser.password_hash,
            updatedUser.id            
        ]
        );
    },
}

module.exports = queries;