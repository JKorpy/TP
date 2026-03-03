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
const {checkLoggedIn, bypassLogin} = require ('./middlewares')

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

app.use(session({
    secret: 'my_session_secret',
    resave: true,
    saveUninitialized: false,
    name: 'manfra.io',
    cookie: {
        maxAge: 10000
    }
}))

app.listen(3000);

//Login Page
app.get('/Login', bypassLogin,(req, res)=> {
    res.render('Login', {error : null})
})

//login post route to recieve the username and password from form
app.post('/Login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Find user in database
    const result = await pool.query(
      "SELECT * FROM users WHERE username = $1",
      [username]
    );

    if (result.rows.length === 0) {
      return res.render("Login", { error: "Wrong credentials" });
    }

    const user = result.rows[0];

    // Compare password with hashed password
    const match = await bcrypt.compare(password, user.password_hash);

    if (!match) {
      return res.render("Login", { error: "Wrong credentials" });
    }

    // Create session
    req.session.user = {
      id: user.id,
      username: user.username
    };

    res.redirect("/");
  } catch (err) {
    console.error(err);
    res.render("Login", { error: "Server error" });
  }
});

app.get('/logout', (req, res) => {
    req.session.destroy()
    res.clearCookie('manfra.io')
    res.redirect('/')
}
)

//Register Page
app.get("/register", (req, res) => {
  res.render("register", { error: null });
});

app.post("/register", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).send("Missing fields");
    }
       if (password.length < 8) {
      return res.render("register", {
        error: "Password must be at least 8 characters",
        username
      });
    }
    const hashedPassword = await bcrypt.hash(password, 10);

    // RETURNING id + username lets us auto-login immediately
    const result = await pool.query(
      "INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username",
      [username, hashedPassword]
    );

    const user = result.rows[0];

    //  Auto-login: create session
    req.session.user = {
      id: user.id,
      username: user.username,
    };

    //  Go straight to protected home page
    res.redirect("/");
  } catch (err) {
    console.error(err);

    if (err.code === "23505") {
      return res.render("register", { error: "Username already exists" });
    }

    res.status(500).send("Error registering user");
  }
});


app.use((req, res, next) => {
        res.locals.user = req.session.user
        next()
})

//configure the routes, creating a basic route like a home route 
app.get('/',checkLoggedIn,(req, res) =>{
    const data = fs.readFileSync("./Products.json");
    const products = JSON.parse(data);
    res.render("index", { products, title: "Login", error: null})

})

//Passing products into EJS (sample products)
app.get("/", (request, response) => {
    const data = fs.readFileSync("./Products.json");
    const products = JSON.parse(data);

    response.render("index", { products, title: "Login", error: null});
});



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
