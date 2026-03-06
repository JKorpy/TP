/* ###############################
    Setup
############################### */

//Import 
const bcrypt = require("bcrypt");
const { pool } = require("./db");
const express = require("express");
//importing the express module
const session = require('express-session')
//using fs to dynamically read data from products JSON file
const fs = require("fs");
const { checkLoggedIn, bypassLogin, attachUserToLocals } = require('./middlewares');

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
        maxAge: 10000
    }
}))


// Makes the logged-in user available to all views so pages can show user-specific content
app.use(attachUserToLocals);

app.listen(3000);

//Login Page

// Route to display the login page, it redirects if the user is already logged in
app.get('/login', bypassLogin,(request, response)=> {
    let error = null;

  if (request.query.error === "session-expired") {
    error = "Your session has expired. Please log in again.";
  }
  response.render('login', {error })
})

//login post route to recieve the username and password from form
app.post('/login', async (request, response) => {
  try {
    const { username, password } = request.body;

    // Check if a user with the provided username exists in the database
    const result = await pool.query(
      "SELECT * FROM users WHERE username = $1",
      [username]
    );

    if (result.rows.length === 0) {
      return response.render("login", { error: "Wrong credentials" });
    }
    // Get the first user returned from the database query
    const user = result.rows[0];

    // Compare the entered password with the hashed password stored in the database
    const match = await bcrypt.compare(password, user.password_hash);
    //if NOT a match throws error
    if (!match) {
      return response.render("login", { error: "Wrong credentials" });
    }

   // Store the logged in user details in the session so they remain authenticated
    request.session.user = {
      id: user.id,
      username: user.username
    };
    // Redirect to homepage after successful login
    response.redirect("/");
  } catch (err) { // Handle unexpected server errors
    console.error(err);
    response.render("login", { error: "Server error" });
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
app.get("/register", (request, response) => {
  response.render("register", { error: null });
});

//Pulls in username and password to be validated
app.post("/register", async (request, response) => {
  try {
    const { username, password } = request.body;
//If username and password are empty shows "Missing Fields"
    if (!username || !password) {
      return response.status(400).send("Missing fields");
    }
    //Validates password is not less than 8 charachters 
       if (password.length < 8) {
      return response.render("register", {
        error: "Password must be at least 8 characters",
        username
      });
    }
    //this hashes the password using bcrypt 
    const hashedPassword = await bcrypt.hash(password, 10);

    // RETURNING id + username lets us auto-login immediately
    const result = await pool.query(
      "INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username",
      [username, hashedPassword]
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
//app.get('/',checkLoggedIn,(request, response) =>{ (use this in finished code!!!!!!!!!!)
app.get('/',(request, response) =>{//(delete this line in finshed code)
    const data = fs.readFileSync("./Products.json");
    const products = JSON.parse(data);
    response.render("index", { products, title: "Home", error: null})

})

//This protects all the pages below from being accessed without a login 
//app.use(checkLoggedIn);

//Catalogue Page
app.get("/catalogue", (request, response) => {
    response.render("catalogue", {title: "Catalogue"});
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
    response.render("list", {title: "Shopping List"});
});

//Profile Page
app.get("/profile", (request, response) => {
    response.render("profile", {title: "Profile"});
});
