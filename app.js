/* ###############################
    Setup
############################### */

//Import 
const express = require("express");
const fs = require("fs");    //using fs to dynamically read data from products JSON file

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

//Passing products into EJS (sample products)
app.get("/", (req, res) => {
    const data = fs.readFileSync("./Products.json");
    const products = JSON.parse(data);

    res.render("index", { products });
});

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

//Profile Page
app.get("/profile", (request, response) => {
    response.render("profile", {title: "Profile"});
});
