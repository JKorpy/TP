const { pool } = require("./db");

//https://node-postgres.com/apis/result

const queries = {

    // ######################
    //  Login Page 
    // ######################         
    
    registerUser: async (client, userInfo, hashedPassword) => {
        const result = await client.query(
            `INSERT INTO users 
            (first_name, last_name, username, email, phone, date_of_birth, password_hash) 
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id, username`,
            [userInfo.firstName, userInfo.lastName, userInfo.username, userInfo.email, userInfo.phone || null, userInfo.dob || null, hashedPassword]
        );        
        return result.rows[0];
    },
    

    //Get all products
    getAllProducts: async (client) => {
        const result = await client.query(`
           SELECT id, name, category, price, brand FROM public.products 
        `);
        return result.rows
    },

    //Add product JSON to PostgreSQL
    addAllProducts: async (client, product) => {
        await client.query(`
            INSERT INTO products (id, name, category, price, brand)
            VALUES ($1, $2, $3, $4, $5)`,
            [product.id, product.name, product.category, product.price, product.brand]    
        );
    },

    // ######################
    //  Catalogue Page 
    // ######################        
    getProduct: async (client, productId) => {
        const result = await client.query(`
        SELECT name FROM products WHERE id = $1`,  
        [productId]
        );
        return result.rows[0];
    },

    //Get products for comparison
    getComparedProducts: async (client, product) => {
        const result = await client.query(`
            SELECT category FROM products
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
            SELECT category FROM products
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
            SELECT id, name, cateogry, price, brand FROM public.products
            WHERE id = $1`, 
            [id]);
        return result.rows[0];
    },

    //get catalogue
    getCatalogue: async (client ,{search, categoryFilter, brandFilter, orderBy, limit, offset}) => {

        const conditions = [];
        const values = [];

        // Full Text Search: (https://www.postgresql.org/docs/current/textsearch-intro.html)
        // to_tsvector('english', name)
        //      - Converts the concatenated text into searchable tokens e.g 'coffe'
        // to_tsquery('english', $1)
        //      - Converts the search term into a query
        // @@
        //      - Matching products are included with the results while the others are excluded'english', $1
        if(search) {
            values.push(`${search}:*`);
            conditions.push(`to_tsvector('english', name) @@ to_tsquery('english', $${values.length})`);
        }

        if(categoryFilter) {
            values.push(categoryFilter);
            conditions.push(`category = $${values.length}`);
        }

        //ANY($1) Matches brand against any value in the passed array.
        if (brandFilter && brandFilter.length > 0) {
            values.push(brandFilter);
            conditions.push(`brand = ANY($${values.length})`);
        }        

        //If no condition, return empty string to get all products else combine all conditons
        //Example: "WHERE search AND categoryFilter"
        let whereClause = "";
        if(conditions.length > 0) {
            whereClause = `WHERE ${conditions.join(" AND ")}`;
        }

        //Example: ORDER BY {name ASC}
        const orderByClause = `ORDER BY ${orderBy}`;

        //Example: LIMIT $3 OFFSET %4, limit to 24 products while skipping 48 products starting at 49
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
            SELECT DISTINCT category FROM products ORDER BY category ASC`
        );
        //Extracts category string from each row object
        return result.rows.map(row => row.category);
    },

    getUniqueBrands: async (client) => {
        const result = await client.query(`
            SELECT DISTINCT brand FROM products ORDER BY brand ASC`
        );
        //Extracts brand string from each row object
        return result.rows.map(row => row.brand);
    },

    //Fetch a single product and the 10 cheapest products within the same category
    getComparison: async (client, id) => {
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
            SELECT l.id, p.name, p.brand, l.quantity, (l.quantity * p.price)::numeric as total
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

    getQuantity: async(client, {listId, userId}) => {
        const result = await client.query(`
            SELECT quantity FROM lists
            WHERE id = $1 AND user_id = $2`,
            [listId, userId]
        );
        return result.rows[0];
    },

    getItem: async(client, {userId, listId}) => {
        const result = await client.query(`
            SELECT l.id, p.name, l.quantity, (l.quantity * p.price)::numeric AS total
            FROM lists l
            JOIN products p ON l.product_id = p.id
            WHERE l.user_id = $1 AND l.id = $2`,
            [userId, listId]
        );       
        return result.rows[0]; 
    },    
    
    // ######################
    //  Home Page 
    // ######################
    getFeaturedProducts: async (client) => {
        const result = await client.query(`
            SELECT name, brand, price FROM products
            ORDER BY RANDOM()
            LIMIT 8`
        );
        return result.rows
    },

    // ######################
    //  Login Page 
    // ######################
    getUser: async (client, username) => {
        const result = await client.query(
            "SELECT * FROM users WHERE username = $1",
            [username]
        );        
        return result.rows[0] || null;
    },

    // ######################
    //  Profile Page 
    // ######################
   getUserById: async (client, id) => {
    const result = await client.query(
        "SELECT * FROM users WHERE id = $1",
        [id]
    );
    return result.rows[0] || null;
},
   updateUser: async (client, updatedUser) => {

    if (updatedUser.password_hash) {
        // WITH password update
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
    } else {
        // WITHOUT password update
        await client.query(`
            UPDATE users
            SET first_name = $1,
                last_name = $2,
                username = $3,
                email = $4,
                phone = $5,
                date_of_birth = $6
            WHERE id = $7`,
            [
                updatedUser.first_name,
                updatedUser.last_name,
                updatedUser.username,
                updatedUser.email,
                updatedUser.phone,
                updatedUser.date_of_birth,
                updatedUser.id
            ]
        );
    }
}
}

module.exports = queries;

    // Old Code
    // //Drop table
    // dropTable: async (client) => {
    //     await client.query(`DROP TABLE IF EXISTS products`)
    // },

    // //Create Table
    // createTable: async (client) => {
    //     await client.query(`
    //         CREATE TABLE IF NOT EXISTS products (
    //             id SERIAL PRIMARY KEY,
    //             name VARCHAR(255),
    //             category VARCHAR(255),
    //             price NUMERIC(10, 2),
    //             description VARCHAR(255)
    //         );
    //     `);    
    // },

    // //Create User Table
    // createUserTable: async (client) => {
    //     await client.query(`
    //         CREATE TABLE IF NOT EXISTS products (
    //             id SERIAL PRIMARY KEY,
    //             name VARCHAR(255),
    //             category VARCHAR(255),
    //             price NUMERIC(10, 2),
    //             description VARCHAR(255)
    //         );
    //     `);    
    // },  

    // //Create Basket Table
    // createListsTable: async (client) => {
    //     await client.query(`
    //         CREATE TABLE IF NOT EXISTS lists (
    //             id SERIAL PRIMARY KEY,
    //             user_id INT REFERENCES users(id),
    //             product_id INT REFERENCES products(id),
    //             quantity INT DEFAULT 1,
    //             UNIQUE (user_id, product_id)
    //         )
    //     `);    
    // }, 
