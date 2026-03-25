/* ###############################
    Setup
############################### */

//Import 
const { error } = require("console");
const bcrypt = require("bcrypt");
const { pool } = require("./db");
const express = require("express");
//importing the express module
const session = require('express-session')
//using fs to dynamically read data from products JSON file
const fs = require("fs");
//Path
const path = require("path");

const { checkLoggedIn, bypassLogin, attachUserToLocals, createCaptcha, generateCaptchaValue} = require('./middlewares');
const { start } = require("repl");
//JSON path
const basketPath = path.join(__dirname, "basket.json");
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
      username: user.username
    };

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
  try {
    const { firstName, lastName, username, email, phone, dob, password, confirmPassword, captchaInput } = request.body;
if (!captchaInput || captchaInput.trim().toUpperCase() !== request.session.captcha) {

  const captcha = generateCaptchaValue();
  request.session.captcha = captcha;

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
    //this hashes the password using bcrypt 
    const hashedPassword = await bcrypt.hash(password, 10);

    // RETURNING id + username lets us auto-login immediately
    const result = await pool.query(
      `INSERT INTO users 
      (first_name, last_name, username, email, phone, date_of_birth, password_hash) 
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, username`,
      [firstName, lastName, username, email, phone || null, dob || null, hashedPassword]
    );

    const user = result.rows[0];

    //  Auto-login: create session
    request.session.user = {
      id: user.id,
      username: user.username,
    };

    //  Go straight to protected home page once registration credentials are correct(autologin)
    response.redirect("/");
  } catch (err) {
    console.error(err);
//"Username already exists" - does not register - does not autologin
    if (err.code === "23505") {
      return response.render("register", { error: "Username already exists" });
    }
 // Handle unexpected server errors during registration
    response.status(500).send("Error registering user");
  }
});



//configure the routes, creating a basic route like a home route 
//Passing products into EJS (sample products)



//app.get('/',checkLoggedIn,(request, response) =>{ //(use this in finished code!!!!!😺!!!!!)also for LOGOUT
app.get('/', checkLoggedIn,(request, response) =>{

    const data = fs.readFileSync("./Products.json");
    const products = JSON.parse(data);
    response.render("index", { products, title: "Home", error: null})

})

//This protects all the pages below from being accessed without a login 
//app.use(checkLoggedIn);

//Catalogue Page
app.get("/catalogue", (request, response) => {
  //Verify the product json file exists
  const products = readJSON(productPath)
  if(!products) {
    return response.status(400).json({message: "Product JSON not found"});
  }
  
  //Get the query parameters (https://www.youtube.com/watch?v=JcAgTtycZg0)
  const search = request.query.search || "";
  const sort = request.query.sort || "ascending";
  const categoryFilter = request.query.category || "";
  const currentPage = parseInt(request.query.page) || 1;
  const limit = 24;
  

  //Search Query (https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/filter)
  let filteredProducts = products.filter(obj => obj.name.toLowerCase().includes(search.toLowerCase()));

  //Filter by Category
  if(categoryFilter) {
    filteredProducts = filteredProducts.filter(obj => obj.category === categoryFilter)
  }
  
  //Get all unique categories from product
  const uniqueCategories = [];
  products.forEach(product => {
    if(!uniqueCategories.includes(product.category)) {
      uniqueCategories.push(product.category);
    }
  });

  //Sort by Order (https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort)
  switch(sort) {
    case "ascending":
      filteredProducts.sort((product1,product2) => product1.name.localeCompare(product2.name));
      break;
    case "descending":
      filteredProducts.sort((product1,product2) => product2.name.localeCompare(product1.name));
      break;      
    case "lowPrice":
      filteredProducts.sort((product1, product2) => parseFloat(product1.price) - parseFloat(product2.price))
      break;
    case "highPrice":
      filteredProducts.sort((product1, product2) => parseFloat(product2.price) - parseFloat(product1.price))
      break;  
    default:
      //No sorting query parameter applied
      break; 
  }

  //Pagination Logic (https://www.geeksforgeeks.org/node-js/pagination-using-node-mongo-express-js-and-ejs/)

  const totalProducts = filteredProducts.length;
  //Example: Divides 200 products by 24 while roudning it up to 9.
  const totalPages = Math.ceil(totalProducts / limit);
  //Calculates the product range
  const startIndex = (currentPage - 1) * limit;
  const endIndex = startIndex + limit;
  //Extracts the products between the starting and ending index
  const productPage = filteredProducts.slice(startIndex, endIndex);

  response.render("catalogue", {
    title: "Catalogue",
    products: productPage,
    currentPage,
    totalPages,
    totalProducts,
    search,
    sort,
    categoryFilter,
    uniqueCategories
  });
});

app.post("/catalogue/add", (request, response) => {
  //Initialisation
  const productId = Number(request.body.id);

  //Verify the product json file exists
  const products = readJSON(productPath)
  if(!products) {
    return response.status(400).json({message: "Product JSON not found"});
  }

  //Verify the product id from the catalogue can be found in the json
  const product = products.find(obj => obj.id === productId);
  if(!product) {
    return response.status(404).json({message: "Product ID not found"});
  }

  //Read basket json data or create a new one
  let basket = readJSON(basketPath) || [];

  //Check for any duplicate items
  const existingItem = basket.find(obj => obj.id === productId);

  //If duplicate item then update quantity, else create a new item
  if(existingItem) {
    existingItem.quantity += 1;
  }
  else {
    basket.push({
        id: product.id,
        name: product.name,
        description: product.description,
        price: product.price,
        quantity: 1
    });
  }
  //Update the basket json
  writeJSON(basketPath, basket);

  //Important for the database stage
  response.json({ message: "Product added", item: product });
});



//Contact Page
app.get("/contact", (request, response) => {
    response.render("contact", {title: "Contact"});
});

//Catalogue Page
app.get("/about", (request, response) => {
    response.render("about", {title: "About Us"});
});

//Stores Page
app.get("/stores", (request, response) => {
    response.render("stores", {title: "Stores"});
});

//Shopping List Page
app.get("/list", (request, response) => {
  const items = readJSON(basketPath);
  response.render("list", { items, title: "Shopping List" });
});

app.put("/list/:id/increase", (request, response) => {
  const result = findItemById(request, response);
  if(!result) return

  const {item, itemList } = result;
  item.quantity++;
  writeJSON(basketPath, itemList);
  response.json(item);
});

app.put("/list/:id/decrease", (request, response) => {
  const result = findItemById(request, response);
  if(!result) return

  // Prevent quantity from going below 1
  const {item, itemList } = result;
  if (item.quantity > 1) {
    item.quantity--;
    writeJSON(basketPath, itemList);
  }

  response.json(item);
});

app.delete("/list/:id/", (request, response) => {
  const itemList = readJSON(basketPath);
  const id = parseInt(request.params.id, 10);
  // Filter out the deleted item
  const updatedList = itemList.filter(obj => obj.id !== id);

  writeJSON(basketPath, updatedList);
  response.json({ success: true });
});

/*
//Profile Page
app.get("/profile", checkLoggedIn, (request, response) => {
    response.render("profile", {
        title: "Profile",
        user: request.session.user
    });
});
/*

*/
app.get("/profile", (request, response) => {
    // For testing purposes, create a dummy user object
    const dummyUser = {
        username: "TestUser",
        email: "testuser@example.com"
    };

    response.render("profile", {
        title: "Profile",
        user: dummyUser
    });
});


//Additional Functions
function findItemById(request, response) {
  const itemList = readJSON(basketPath);
  const itemId = parseInt(request.params.id, 10);
  const item = itemList.find(obj => obj.id === itemId);

  if(!item) {
    return response.status(404).json({error: "Item not found"});
  }

  return {item, itemList};
} 

function readJSON(filePath) {
  if(!fs.existsSync(filePath)) return [];
  try {
    const data = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(data || "[]");
  } 
  catch (err) {
    console.error("Error reading json file", err);
    return [];
  }
}

function writeJSON(filePath, items) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(items, null, 2));
  } 
  catch(err) {
    console.error("Error writing json file", err);
  }
}
