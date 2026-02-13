/* ###############################
    Setup
############################### */

//Import 
const express = require("express");
//Express App
const app = express();
//View Engine
app.set("view engine", "ejs");

//Middleware for static files
//Parse JSON data
app.use(express.json());
//Use static files in public folder
app.use(express.static("public"));
//Parse URL-encoded dta for form inputs
app.use(express.urlencoded({ extended: true }));

app.listen(3000);

//Home Page
app.get("/", (request, response) => {
    response.render("index", {title: "Home"});
});

//Catalogue Page
app.get("/catalogue", (request, response) => {
    response.render("catalogue", {title: "Catalogue"});
});

//Login Page
app.get("/login", (request, response) => {
    response.render("login", {title: "Login"});
});

//Register Page
app.get("/register", (request, response) => {
    response.render("register", {title: "Register"});
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