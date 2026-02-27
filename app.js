/* ###############################
    Setup
############################### */

//Import 
const express = require("express");
//importing the express module
const session = require('express-session')
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
    response.render("login", {title: "Login", error: null});
});

//login post route to recieve the username and password from form
app.post('/Login', (req, res) => {
    if  (req.body.username === 'john'&& req.body.password ==='123'){
        //create session - i will replace with database
        req.session.user = { id: 1, username: 'john', name: 'John Doe'}
        res.redirect('/')
    }else{
        res.render('Login',{error : 'Wrong Credentils'})
    }
})

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