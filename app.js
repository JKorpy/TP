/* ###############################
    Setup
############################### */

//Import 
const { error } = require("console");
const bcrypt = require("bcrypt");
const { pool } = require("./model/db");
const productQuery = require("./public/js/queries");
//importing the express module
const session = require('express-session')
const express = require("express");
//Path
const path = require("path");

const { checkLoggedIn, bypassLogin, attachUserToLocals, createCaptcha, generateCaptchaValue} = require('./middlewares');
const { start } = require("repl");
const queries = require("./public/js/queries");
//JSON path
const productPath = path.join(__dirname, "products.json");


//Express App
const app = express();
//View Engine
app.set("view engine", "ejs");


//Middleware for static files
//Parse JSON data
app.use(express.json());
//Use static files in public folder
app.use(express.static("public"));
//default set to true so set to false to use library querystring
app.use(express.urlencoded({ extended: false }));


// Configures session middleware for the application.
// Creates a signed session cookie containing a session ID.
// Session data is stored server-side and expires after 10 seconds.
app.use(session({
    secret: 'my_session_secret',
    resave: true,
    saveUninitialized: false,
    name: 'manfra.io',
    cookie: {
        maxAge: 1000 * 60 * 10
    }
}))


// Makes the logged-in user available to all views so pages can show user-specific content
app.use(attachUserToLocals);

app.listen(3000);

//Login Page

// Route to display the login page, it redirects if the user is already logged in
app.get('/login', bypassLogin, createCaptcha, (request, response) => {
    let error = null;
    if (request.query.error === "session-expired") {
        error = "Your session has expired. Please log in again.";
    }

    response.render('login', { error, captcha: response.locals.captcha });
});

//login post route to recieve the username and password from form
app.post('/login', async (request, response) => {
  try {
    const { firstName, lastName, username, email, phone, dob, password, confirmPassword, captchaInput } = request.body;

    // Check captcha first
    if (!captchaInput || captchaInput.toUpperCase() !== request.session.captcha) {
      const captcha = generateCaptchaValue();
      request.session.captcha = captcha;

      return response.render("login", {
        error: "Incorrect captcha",
        captcha
      });
    }

    // Check if a user with the provided username exists in the database
    const result = await pool.query(
      "SELECT * FROM users WHERE username = $1",
      [username]
    );

    if (result.rows.length === 0) {
      const captcha = generateCaptchaValue();
      request.session.captcha = captcha;

      return response.render("login", {
        error: "Wrong credentials",
        captcha
      });
    }

    // Get the first user returned from the database query
    const user = result.rows[0];

    // Compare the entered password with the hashed password stored in the database
    const match = await bcrypt.compare(password, user.password_hash);

    if (!match) {
      const captcha = generateCaptchaValue();
      request.session.captcha = captcha;

      return response.render("login", {
        error: "Wrong credentials",
        captcha
      });
    }

    
    // Store the logged in user details in the session so they remain authenticated
    request.session.user = {
      id: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      username: user.username,
      email: user.email,
      phone: user.phone,
      dob: user.dob,
      password: user.password
    };

    /*
    //Alternative instead of manual mapping
     request.session.user = user; //Doesn't take in firstname, lastname & password
    */

    // Clear captcha after successful login
    request.session.captcha = null;

    // Redirect to homepage after successful login
    response.redirect("/");
  } catch (err) {
    console.error(err);

    const captcha = generateCaptchaValue();
    request.session.captcha = captcha;

    response.render("login", {
      error: "Server error",
      captcha
    });
  }
});
// clear the user session upon logout 
app.get('/logout', (request, response) => {
    request.session.destroy()
    response.clearCookie('manfra.io')
    response.redirect('/')
}
)

//Register Page
app.get("/register", bypassLogin, createCaptcha, (request, response) => {
  response.render("register", {
    error: null,
    captcha: response.locals.captcha
  });
});

//Pulls in username and password to be validated
app.post("/register", async (request, response) => {
  const userInfo = request.body;
  const regenerateCaptcha = () => {
    const captcha = generateCaptchaValue();
    request.session.captcha = captcha;
    return captcha;
  }

  //Validate CAPTCHA
  if (!userInfo.captchaInput || userInfo.captchaInput.trim().toUpperCase() !== request.session.captcha) {
    return response.render("register", {
      error: "Incorrect captcha",
      captcha: regenerateCaptcha()
    });
  }

  //If username and password are empty shows "Missing Fields"
  if (!userInfo.username || !userInfo.password) {
    return response.status(400).send("Missing fields");
  }
  //Validates password is not less than 8 charachters 
  if (userInfo.password.length < 8) {
    return response.render("register", {
      error: "Password must be at least 8 characters",
      captcha: regenerateCaptcha()
    });
  }

  //OPEN CONNECTION
  const client = await pool.connect();  
  try {
    //this hashes the password using bcrypt 
    const hashedPassword = await bcrypt.hash(userInfo.password, 10);

    // RETURNING id + username lets us auto-login immediately
    const result = await queries.registerUser(client, userInfo, hashedPassword);

    //  Auto-login: create session
    request.session.user = {
      id: result.id,
      username: result.username,
    };
    //  Go straight to protected home page once registration credentials are correct(autologin)
    response.redirect("/");
  } 
  catch (err) {
    console.error("Registration error: ",err);
    //"Username already exists" - does not register - does not autologin
    if (err.code === "23505") {
      return response.render("register", { 
        error: "Username already exists",
        captcha: regenerateCaptcha() 
      });
    }
    // Handle unexpected server errors during registration
    response.status(500).send("Error registering user");
  }
  finally {
    //END CONNECTION
    client.release();    
  }
});



//configure the routes, creating a basic route like a home route 
//Passing products into EJS (sample products)


//Adding featured stores:
const stores = [
  {
    name: "Tesco",
    logo: "/img/tescoLogo.jpg",
    url: "https://www.tesco.com/"
  },
  {
    name: "SuperValu",
    logo: "/img/supervaluLogo.webp",
    url: "https://supervalu.ie/"
  },
  {
    name: "Dunnes",
    logo: "/img/dunnesLogo.webp",
    url: "https://www.dunnesstoresgrocery.com/"
  },
  {
    name: "Lidl",
    logo: "/img/lidlLogo.png",
    url: "https://www.lidl.com/"
  }

];

//Home Page
app.get('/', checkLoggedIn, async (request, response) =>{
  //OPEN CONNECTION
  const client = await pool.connect();  
  try {
    //Query
    const featuredProducts = await queries.getFeaturedProducts(client);
    response.render("index", { products: featuredProducts, stores, title: "Home", error: null});
  }
  catch(err) {
    console.error("Failed to delete item:", err);
    response.status(500).json({ message: "Failed to delete item" });

  }
  finally {
    //END CONNECTION
    client.release();       
  }   
});

//This protects all the pages below from being accessed without a login 
//app.use(checkLoggedIn);

//Catalogue Page (async necessary for database queries)
app.get("/catalogue", async (request, response) => {  
  //Get the query parameters (https://www.youtube.com/watch?v=JcAgTtycZg0)
  const search = request.query.search || "";
  const sort = request.query.sort || "ascending";
  const categoryFilter = request.query.category || "";
  const currentPage = parseInt(request.query.page) || 1;
  const limit = 24;
  const offset =  (currentPage - 1) * limit;

  //Sort parameters
  const sortOptions = {
    ascending: "name ASC",
    descending: "name DESC",
    lowPrice: "price ASC",
    highPrice: "price DESC"
  }
  const orderBy = sortOptions[sort] || "name ASC";

  //OPEN CONNECTION
  const client = await pool.connect();
  try {
    //Search the products and total number of products
    const {products, totalProducts} = await productQuery.getCatalogue(client, {
      search, categoryFilter, orderBy, limit, offset
    });
    //Get the unique categories
    const uniqueCategories = await productQuery.getUniqueCategories(client);

    //Calculate total pages 
    const totalPages = Math.ceil(totalProducts / limit);

    // console.log("Total products found:", totalProducts);
    // console.log("Products returned:", productsResult.rows.length);
    // console.log("Sample row:", productsResult.rows[0]);
    // console.log("Where where?", whereClause);
    // console.log("Values:", values); 

    //Output
    response.render("catalogue", {
      title: "Catalogue",
      products,
      currentPage,
      totalPages,
      totalProducts,
      search,
      sort,
      categoryFilter,
      uniqueCategories,
    });    
  }
  catch(err) {
    console.error("Failed to load products:", err);
  }
  finally {
    //END CONNECTION
    client.release();
  }
});

app.get("/catalogue/:id", async (request, response) => {
  //Initialisation
  const id = parseInt(request.params.id);
  //const product = products.find(obj => obj.id === id);
  //OPEN CONNECTION
  const client = await pool.connect()
  try {
    //Query
    const {product, filtered} = await queries.getComparison(client, id); 
    //This is new 
    //1. Updates the ejs variable tags during server-side
    //2. Fetches HTTP response to insert the html text into the catalogue    
    response.render("partials/product", {product, filtered});    
  }
  catch(err) {
    console.error("Failed to load products in modal:", err);
  } 
  finally {
    //END CONNECTION
    client.release();   
  }
});

app.post("/catalogue/add", async (request, response) => {
  //Initialisation
  const productId = Number(request.body.id);
  const userId = request.session.user.id;
  //OPEN CONNECTION
  const client = await pool.connect();
  try {
    //Query
    const productResult = await client.query(`
      SELECT name FROM products WHERE id = $1`,  
      [productId]
    );
    await queries.addToShoppingList(client, {userId, productId});
    
    response.json({productName: productResult.rows[0].name});
    
  }
  catch(err) {
    console.error("Failed add products to the shopping list:", err);
  } 
  finally {
    //END CONNECTION
    client.release();  
  }
});


//Contact Page
app.get("/contact", (request, response) => {
    response.render("contact", {title: "Contact"});
});

//Shopping List Page
app.get("/list", async (request, response) => {
  //Initialisation
  const userId = parseInt(request.session.user.id);

  //OPEN CONNECTION
  const client = await pool.connect();  
  try {
    //Query
    const items = await queries.getShoppingList(client, userId);
    //console.log("Sample item:", items[0]);
    //Output
    response.render("list", { items, title: "Shopping List" });
  }
  catch(err) {
    console.error("Failed to get shopping list", err);
  }
  finally {
    //END CONNECTION
    client.release();       
  }   
 
  
});

app.put("/list/:id/increase", async (request, response) => {
  const userId = parseInt(request.session.user.id);
  const listId = parseInt(request.params.id);
  //OPEN CONNECTION
  const client = await pool.connect();  
  try {
    //Query
    const result = await updateQuantity(client, userId, listId, 1);
    if(!result) return response.status(404).json({message: "Item not found"});
    response.json(result);
  }
  catch(err) {
    console.error("Failed to increase quantity of the product", err);
    response.status(500).json({ message: "Failed to increase quantity" });
  }
  finally {
    //END CONNECTION
    client.release();
  }   
});

app.put("/list/:id/decrease", async (request, response) => {
  const userId = parseInt(request.session.user.id);
  const listId = parseInt(request.params.id);
  //OPEN CONNECTION
  const client = await pool.connect();  
  try {
    //Query
    const result = await updateQuantity(client, userId, listId, -1);
    if(!result) return response.status(404).json({message: "Item not found"});
    response.json(result);
  }
  catch(err) {
    console.error("Failed to decrease quantity of the product", err);
    response.status(500).json({ message: "Failed to decrease quantity" });
  }
  finally {
    //END CONNECTION
    client.release();
  }   
});

app.delete("/list/:id/", async (request, response) => {
  const userId = parseInt(request.session.user.id);
  const listId = parseInt(request.params.id);  

  //OPEN CONNECTION
  const client = await pool.connect();  
  try {
    //Query
    await queries.removeFromShoppingList(client, {userId, listId});
    response.json({sucess: true});
  }
  catch(err) {
    console.error("Failed to delete item:", err);
    response.status(500).json({ message: "Failed to delete item" });

  }
  finally {
    //END CONNECTION
    client.release();       
  }   
});

//Profile Page
app.get("/profile", checkLoggedIn, async (request, response) => {
  const userId = parseInt(request.session.user.id);
  //OPEN CONNECTION
  const user = {
    firstName: request.session.user.firstName,
    lastName: request.session.user.lastName,
    username: request.session.user.username,
    email: request.session.user.email,
    phone: request.session.user.phone,
    dob: request.session.user.password,
    password: ""
  };
  // console.log(user.firstName);
  response.render("profile", {
    title: "Profile",
    user
  }); 
});

//Updating profile info
app.post('/profile/update', async (req, res) => {
    const updatedUser = {
        first_name: req.body.firstName,
        last_name: req.body.lastName,
        username: req.body.username,
        email: req.body.email,
        phone: req.body.phone,
        date_of_birth: req.body.dob,
        password_hash: await bcrypt.hash(req.body.password, 10),
        id: req.session.user.id
    };

  //update DB or session
  console.log(updatedUser);
  //OPEN CONNECTION
  const client = await pool.connect();  
  try {
    await client.query(`BEGIN`);
    console.log("Transaction started");    
    //Query
    await queries.updateUser(client, updatedUser);
    await client.query(`COMMIT`);
    console.log("Transaction started");    
    res.redirect('/profile');    
  }
  catch(err) {
    await client.query(`ROLLBACK`);
    console.log("Transaction started");    
    console.error("Failed to update user information", err);
    res.status(500).json({ message: "Failed to update user information" });

  }
  finally {
    //END CONNECTION
    client.release();       
  }      
});

//Additional Functions
async function updateQuantity(client, userId, listId, value) {
    //Fetch current quantity
    const current = await client.query(`
      SELECT quantity FROM lists
      WHERE id = $1 AND user_id = $2`,
      [listId, userId]
    );
    //Checkpoint 1: Prvent undefined
    if (current.rows.length === 0) return null;

    //Verify if the product should be deleted
    const quantity = current.rows[0].quantity;
    if(quantity + value <= 0) {
      await queries.removeFromShoppingList(client, {userId, listId});
      return {deleted: true};
    }

    //Perform Additon/Subtraction
    const newQuantity = quantity + value;

    await queries.updateFromShoppingList(client, {userId, listId, quantity: newQuantity});
    // Return updated item
    const result = await client.query(`
        SELECT l.id, p.name, l.quantity, (l.quantity * p.price)::numeric AS total
        FROM lists l
        JOIN products p ON l.product_id = p.id
        WHERE l.user_id = $1 AND l.id = $2`,
        [userId, listId]
    );
    //console.log("Result:", result.rows[0]);
    return result.rows[0];
}


