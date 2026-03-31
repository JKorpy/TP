/* ###############################
    Setup
############################### */

//Import 
const { error } = require("console");
const bcrypt = require("bcrypt");
const { pool } = require("./model/db");
//importing the express module
const session = require('express-session')
const express = require("express");

const { checkLoggedIn, bypassLogin, attachUserToLocals, createCaptcha, regenerateCaptchaValue, validateCaptcha} = require('./middlewares');
const { start } = require("repl");
const queries = require("./public/js/queries");

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

(async () => {
  try {
    const res = await pool.query(`
      SELECT table_schema, table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = 'products';
    `);

    console.log("Table check result:", res.rows);
  } catch (err) {
    console.error("Error checking table:", err);
  }
})();
(async () => {
  try {
    const res = await pool.query("SELECT current_database(), inet_server_addr(), inet_server_port()");
    console.log("Node DB:", res.rows[0]);
  } catch (err) {
    console.error(err);
  }
})();
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


// Route to display the login page, it redirects if the user is already logged in
app.get('/login', bypassLogin, createCaptcha, (request, response) => {
    let error = null;
    if (request.query.error === "session-expired") {
        error = "Your session has expired. Please log in again.";
    }

    response.render('login', { error, captcha: response.locals.captcha });
});

//login post route to recieve the username and password from form
app.post('/login', validateCaptcha, async (request, response) => {
  const userInfo = request.body;

  let client  = null;  
  try {  
    //OPEN CONNECTION    
    client = await pool.connect(); 
    // Check if a user with the provided username exists in the database and return the user object
    const user = await queries.getUser(client, userInfo.username);

    // Compare the entered password with the hashed password stored in the database
    const match = user && await bcrypt.compare(userInfo.password, user.password_hash);

    //If user not found or password does not match, return an error
    if (!match) {
      return response.render("login", {
        error: "Wrong credentials",
        captcha: regenerateCaptchaValue(request)
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

  } 
  catch (err) {
    console.error(err);
    return response.render("login", {
      error: "Server error",
      captcha: regenerateCaptchaValue(request)
    });
  }
  finally {
    // END CONNECTION
    client.release();
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
app.post("/register", validateCaptcha, async (request, response) => {
  const userInfo = request.body;

  //If username and password are empty shows "Missing Fields"
  if (!userInfo.username || !userInfo.password) {
    return response.status(400).send("Missing fields");
  }
  //Validates password is not less than 8 charachters 
  if (userInfo.password.length < 8) {
    return response.render("register", {
      error: "Password must be at least 8 characters",
      captcha: regenerateCaptchaValue(request)
    });
  }

<<<<<<< HEAD
  return response.render("register", {
    error: "Incorrect captcha",
    captcha
  });
}

//If username and password are empty shows "Missing Fields"
    if (!username || !password) {
      return response.status(400).send("Missing fields");

  }
    //Validates password is not less than 8 charachters 
       if (password.length < 8) {
  const captcha = generateCaptchaValue();
  request.session.captcha = captcha;

  return response.render("register", {
    error: "Password must be at least 8 characters",
    captcha
  });
}
=======
  let client  = null;  
  try {  
    //OPEN CONNECTION    
    client = await pool.connect(); 
>>>>>>> 6b1f4ab7f3c6316151c5170bb7b6b72db58417ca
    //this hashes the password using bcrypt 
    const hashedPassword = await bcrypt.hash(userInfo.password, 10);

    //Queries + Transaction
    await client.query(`BEGIN`);
    console.log("Transaction started");    
    // RETURNING id + username lets us auto-login immediately
    const result = await queries.registerUser(client, userInfo, hashedPassword);
    await client.query(`COMMIT`);
    console.log("Transaction committed");    

    //  Auto-login: create session
    request.session.user = {
      id: result.id,
      username: result.username,
    };
    //  Go straight to protected home page once registration credentials are correct(autologin)
    response.redirect("/");
  } 
  catch (err) {
    //Transaction
    await client.query(`ROLLBACK`);
    console.log("Transaction rolled back");  

    console.error("Registration error: ",err);
    //"Username already exists" - does not register - does not autologin
    if (err.code === "23505") {
      return response.render("register", { 
        error: "Username already exists",
        captcha: regenerateCaptchaValue(request) 
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


//Home Page
app.get('/', checkLoggedIn, async (request, response) =>{
  let client  = null;  
  try {    
    //OPEN CONNECTION 
    client = await pool.connect();
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
app.use(checkLoggedIn);

//Catalogue Page (async necessary for database queries)
app.get("/catalogue", checkLoggedIn, async (request, response) => {  
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

  let client  = null;  
  try {  
    //OPEN CONNECTION    
    client = await pool.connect();    
    //Search the products and total number of products
    const {products, totalProducts} = await queries.getCatalogue(client, {
      search, categoryFilter, orderBy, limit, offset
    });
    //Get the unique categories
    const uniqueCategories = await queries.getUniqueCategories(client);

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

app.get("/catalogue/:id", checkLoggedIn, async (request, response) => {
  //Initialisation
  const id = parseInt(request.params.id);

  let client  = null;  
  try {  
    //OPEN CONNECTION    
    client = await pool.connect(); 
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

app.post("/catalogue/add", checkLoggedIn, async (request, response) => {
  //Initialisation
  const productId = Number(request.body.id);
  const userId = request.session.user.id;

  let client  = null;  
  try {  
    //OPEN CONNECTION    
    client = await pool.connect();    

    //Get Product information
    const productResult = await queries.getProduct(client, productId);

    //Query & Transaction
    await client.query(`BEGIN`);
    console.log("Transaction started");        
    await queries.addToShoppingList(client, {userId, productId});
    await client.query(`COMMIT`);
    console.log("Transaction committed");
    
    //Pass Product Information
    response.json({productName: productResult.name});
  }
  catch(err) {
    await client.query(`ROLLBACK`);
    console.log("Transaction rolled back");        
    console.error("Failed add products to the shopping list:", err);
  } 
  finally {
    //END CONNECTION
    client.release();  
  }
});


//Contact Page
app.get("/contact", checkLoggedIn, (request, response) => {
    response.render("contact", {title: "Contact"});
});

//Shopping List Page
app.get("/list", checkLoggedIn, async (request, response) => {
  //Initialisation
  const userId = parseInt(request.session.user.id);

  let client  = null;  
  try {  
    //OPEN CONNECTION    
    client = await pool.connect();   
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

app.put("/list/:id/increase", checkLoggedIn, async (request, response) => {
  const userId = parseInt(request.session.user.id);
  const listId = parseInt(request.params.id);

  let client  = null;  
  try {  
    //OPEN CONNECTION    
    client = await pool.connect();      
    //Query & Transaction
    await client.query(`BEGIN`);
    console.log("Transaction started");        
    const result = await updateQuantity(client, userId, listId, 1);
    await client.query(`COMMIT`);
    console.log("Transaction committed");        
    if(!result) return response.status(404).json({message: "Item not found"});
    response.json(result);
  }
  catch(err) {
    await client.query(`ROLLBACK`);
    console.log("Transaction rolled back");        
    console.error("Failed to increase quantity of the product", err);
    response.status(500).json({ message: "Failed to increase quantity" });
  }
  finally {
    //END CONNECTION
    client.release();
  }   
});

app.put("/list/:id/decrease", checkLoggedIn, async (request, response) => {
  const userId = parseInt(request.session.user.id);
  const listId = parseInt(request.params.id);

  let client  = null;  
  try {  
    //OPEN CONNECTION    
    client = await pool.connect(); ;      
    //Query & Transaction
    await client.query(`BEGIN`);
    console.log("Transaction started");        
    const result = await updateQuantity(client, userId, listId, -1);    
    await client.query(`COMMIT`);
    console.log("Transaction committed");        
    if(!result) return response.status(404).json({message: "Item not found"});    
    response.json(result);
  }
  catch(err) {
    await client.query(`ROLLBACK`);
    console.log("Transaction rolled back");        
    console.error("Failed to decrease quantity of the product", err);
    response.status(500).json({ message: "Failed to decrease quantity" });
  }
  finally {
    //END CONNECTION
    client.release();
  }   
});

app.delete("/list/:id/", checkLoggedIn, async (request, response) => {
  const userId = parseInt(request.session.user.id);
  const listId = parseInt(request.params.id);  

  let client  = null;  
  try {  
    //OPEN CONNECTION    
    client = await pool.connect(); 
    //Query & Transaction
    await client.query(`BEGIN`);
    console.log("Transaction started");          
    await queries.removeFromShoppingList(client, {userId, listId});
    await client.query(`COMMIT`);
    console.log("Transaction committed");    
    response.json({success: true});
  }
  catch(err) {
    await client.query(`ROLLBACK`);
    console.log("Transaction rolled back");    
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
app.post('/profile/update', checkLoggedIn, async (request, response) => {
  const updatedUser = {
      first_name: request.body.firstName,
      last_name: request.body.lastName,
      username: request.body.username,
      email: request.body.email,
      phone: request.body.phone,
      date_of_birth: request.body.dob,
      password_hash: await bcrypt.hash(request.body.password, 10),
      id: request.session.user.id
  };

  //update DB or session
  console.log(updatedUser); 

  let client  = null;  
  try {  
    //OPEN CONNECTION    
    client = await pool.connect();    
    //TRANSACTION 
    await client.query(`BEGIN`);
    console.log("Transaction started");    
    await queries.updateUser(client, updatedUser);
    await client.query(`COMMIT`);
    console.log("Transaction committed");    
    response.redirect('/profile');    
  }
  catch(err) {
    //TRANSACTION & Errors
    await client.query(`ROLLBACK`);
    console.log("Transaction rolled back");    
    console.error("Failed to update user information", err);
    response.status(500).json({ message: "Failed to update user information" });
  }
  finally {
    //END CONNECTION
    client.release();       
  }      
});

//Additional Functions
async function updateQuantity(client, userId, listId, value) {
  //Fetch current quantity
  const current =  await queries.getQuantity(client, {listId, userId});

  //Checkpoint 1: Prvent undefined
  if (!current) return null;

  //Verify if the product should be deleted
  const quantity = current.quantity;
  if(quantity + value <= 0) {
    await queries.removeFromShoppingList(client, {userId, listId});
    return {deleted: true};
  }

  //Perform Additon/Subtraction
  const newQuantity = quantity + value;
  await queries.updateFromShoppingList(client, {userId, listId, quantity: newQuantity});

  // Return updated item
  return await queries.getItem(client, {userId, listId});
}


