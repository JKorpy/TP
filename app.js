/* ###############################
    Setup
############################### */

//Import 
const express = require("express");
//importing the express module
const session = require('express-session')
//using fs to dynamically read data from products JSON file
const fs = require("fs");
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
    saveUninitialized: false
}))

app.listen(3000);

//Passing products into EJS (sample products)
app.get("/", (request, response) => {
    const data = fs.readFileSync("./Products.json");
    const products = JSON.parse(data);

    response.render("index", { products, title: "Login", error: null});
});

//login post route to recieve the username and password from form
app.post('/login', (request, response) => {
    if  (request.body.username === 'john'&& request.body.password ==='123'){
        //create session - i will replace with database
        request.session.user = { id: 1, username: 'john', name: 'John Doe'}
        response.redirect('/')
    }else{
        response.render('login',{error : 'Wrong Credentils'})
    }
})

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

//Shopping List Page
app.get("/list", (request, response) => {
    response.render("list", {title: "Shopping List"});
});

//Profile Page
app.get("/profile", (request, response) => {
    response.render("profile", {title: "Profile"});
});