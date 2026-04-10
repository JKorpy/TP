const { pool } = require("../model/db");
const queries = require("../model/queries");

//Adding featured stores:
const stores = [
    {
        name: "Centra",
        logo: "/img/centraLogo_svg.webp",
        url: "https://centra.ie/"
    },
    {
        name: "Mace",
        logo: "/img/maceLogo_svg.webp",
        url: "https://www.mace.ie/"
    },
    {
        name: "Spar",
        logo: "/img/sparLogo_svg.png",
        url: "https://www.spar.ie/"
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