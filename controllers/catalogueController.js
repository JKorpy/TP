const { pool } = require("../model/db");
const queries = require("../model/queries");
const catalogueService = require('../service/catalogueService')(queries);


exports.getCatalogue = async (request, response) => {
  //Get the query parameters (https://www.youtube.com/watch?v=JcAgTtycZg0)
  const search = request.query.search || "";
  const sort = request.query.sort || "ascending";
  const categoryFilter = request.query.category || "";
  const currentPage = parseInt(request.query.page) || 1;

  let client  = null;  
  try {  
    //OPEN CONNECTION    
    client = await pool.connect();    

    //Service
    const {products, totalProducts, totalPages, uniqueCategories} = await catalogueService.getCataloguePage(client, {search, sort, categoryFilter, currentPage});

    //Output
    response.render("catalogue", {
      title: "Catalogue",
      products,
      currentPage,
      totalPages,
      totalProducts,
      search,
      sort,
      categoryFilter,
      uniqueCategories,
    });    
  }
  catch(err) {
    console.error("Failed to load products:", err);
    response.status(500).json({ message: "Failed to load products in catalogue" });
  }
  finally {
    //END CONNECTION
    if (client) client.release();
  }    
};
exports.getProductModal = async (request, response) => {
  //Initialisation
  const id = parseInt(request.params.id);

  let client  = null;  
  try {  
    //OPEN CONNECTION    
    client = await pool.connect(); 
    //Query
    const {product, filtered} = await queries.getComparison(client, id); 
    //This is new 
    //1. Updates the ejs variable tags during server-side
    //2. Fetches HTTP response to insert the html text into the catalogue    
    response.render("partials/product", {product, filtered});    
  }
  catch(err) {
    console.error("Failed to load products in modal:", err);
    response.status(500).json({ message: "Failed to load products in modal" });
  } 
  finally {
    //END CONNECTION
    client.release();   
  }    
};
exports.addToList = async (request, response) => {
  //Initialisation
  const productId = Number(request.body.id);
  const userId = request.session.user.id;

  let client  = null;  
  try {  
    //OPEN CONNECTION    
    client = await pool.connect();    

    //Service
    const productResult = await catalogueService.addProductToList(client, { userId, productId });
    
    //Pass Product Information
    response.json({productName: productResult.name});
  }
  catch(err) {
    console.error("Failed add products to the shopping list:", err);
    response.status(500).json({ message: "Failed append items to shopping list" });
  } 
  finally {
    //END CONNECTION
    client.release();  
  }    
};