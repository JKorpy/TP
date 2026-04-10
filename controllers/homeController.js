const { pool } = require("../model/db");
const queries = require("../model/queries");

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
exports.getHome = async (request, response) => {
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
};