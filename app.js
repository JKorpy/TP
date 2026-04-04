/* ###############################
    Setup
############################### */
//Import (Do we need this?)
const { error } = require("console");
const { start } = require("repl");
//importing the express module
const express = require("express");
const session = require('express-session')
const { attachUserToLocals, checkLoggedIn } = require('./middlewares');

/* ###############################
    Routes Setup
############################### */

const authRoutes = require("./routes/authRoute");
const homeRoutes = require("./routes/homeRoute");
const catalougeRoutes = require("./routes/catalogueRoute");
const listRoutes = require("./routes/listRoute");
const profileRoutes = require("./routes/profileRoute");
const contactRoutes = require("./routes/contactRoute");

/* ###############################
    Express App Setup
############################### */
const app = express();

//View Engine
app.set("view engine", "ejs");
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

//Starts the authentication process
app.use("/", authRoutes);

//This protects all the pages below from being accessed without a login 
//This must be after the authentication process or it will redirect indefinitely
app.use(checkLoggedIn);

//Routes
app.use("/", homeRoutes)
app.use("/catalogue", catalougeRoutes);
app.use("/list", listRoutes);
app.use("/profile", profileRoutes);
app.use("/contact", contactRoutes);

//Error Check
app.use((error, response,) => {
  console.error(error);
  response.status(500).render("error", { message: "Route failed" });
});

//Host on address 3000
app.listen(3000);

// You will need to read this article in order to understand this application structure
// https://www.codementor.io/@evanbechtol/node-service-oriented-architecture-12vjt9zs9i
// EXTRA RESOURCES:
//https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Server-side/Express_Nodejs/routes
//https://www.youtube.com/watch?v=LGhgBoe_zsE

// Test Frameworks and ideas
//https://www.albertgao.com/2017/05/24/how-to-test-expressjs-with-jest-and-supertest/
//https://dev.to/mohinsheikh/writing-unit-tests-for-an-expressjs-application-a-beginner-friendly-guide-42eo

// Jest
//  - Controllers
//  - Middleware
//  - DOM JS (jsdom)
// SuperTest (HTTP request mainly)
//  - Routes (Optional)
//  - EJS (Optional)