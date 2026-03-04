/* ###############################
    Setup
############################### */

//Import 
const { error } = require("console");
const express = require("express");
//importing the express module
const session = require('express-session')
//using fs to dynamically read data from products JSON file
const fs = require("fs");
//Path
const path = require("path");
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
    const data = fs.readFileSync("./Products.json");
    const products = JSON.parse(data);

    response.render("catalogue", {products, title: "Catalogue"});
});

app.post("/catalogue/add", (request, response) => {
    const productId = Number(request.body.id);
    const quantity = 1;

    const productsPath = path.join(__dirname, "Products.json");

    if (!fs.existsSync(productsPath)) {
        return response.status(500).json({ message: "Products file missing" });
    }

    // Read products
    const productsData = fs.readFileSync(productsPath, "utf-8");
    const products = JSON.parse(productsData);

    const product = products.find(x => x.id === productId);

    if (!product) {
        return response.status(404).json({ message: "Product not found" });
    }

    const basketPath = path.join(__dirname, "basket.json");

    let list = [];

    // Read existing basket
    if (fs.existsSync(basketPath)) {
        try {
            const data = fs.readFileSync(basketPath, "utf-8");
            list = data ? JSON.parse(data) : [];
        } catch (err) {
            console.error("Error parsing basket.json:", err);
            list = []; // fallback to empty array
        }
    }

    // 🔎 Check for duplicate
    const existingItem = list.find(x => x.id === productId);

    if (existingItem) {
        // Increase quantity
        existingItem.quantity += 1;
    } else {
        // Create new item
        const item = {
            id: product.id,
            name: product.name,
            description: product.description,
            price: product.price,
            quantity: quantity
        };

        list.push(item);
    }

    // Save updated basket
    fs.writeFileSync(basketPath, JSON.stringify(list, null, 2));

    response.json({ message: "Product saved successfully" });
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
    const basketPath = path.join(__dirname, "basket.json");
    let items = [];

    if (fs.existsSync(basketPath)) {
        const data = fs.readFileSync(basketPath, "utf-8");
        try {
            items = JSON.parse(data || "[]");
        } catch (err) {
            console.log(error);
            items = [];
        }
    }
    response.render("list", { items, title: "Shopping List" });
});

//Profile Page
app.get("/profile", (request, response) => {
    response.render("profile", {title: "Profile"});
});