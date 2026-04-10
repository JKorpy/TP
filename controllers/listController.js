const { pool } = require("../model/db");
const queries = require("../model/queries");
const listService = require("../service/listService")(queries);

exports.getList = async (request, response) => {
    //Initialisation
    const userId = parseInt(request.session.user.id);

    let client  = null;  
    try {  
        //OPEN CONNECTION    
        client = await pool.connect();   
        //Query
        const items = await queries.getShoppingList(client, userId);
        //Output
        response.render("list", { items, title: "Shopping List" });
    }
    catch(error) {
        console.error("Failed to get shopping list", error);
        response.status(500).json({ message: "Could not load shopping list." });
    }
    finally {
        //END CONNECTION
        if (client) client.release();       
    }     
};
exports.incrementItem = async (request, response) => {
    const userId = parseInt(request.session.user.id);
    const listId = parseInt(request.params.id);

    let client  = null;  
    try {  
        //OPEN CONNECTION    
        client = await pool.connect();
        //Service      
        const result = await listService.addItemByQuantity(client, userId, listId);
        //Output - failed or success
        if (!result) return response.status(404).json({ message: "Item not found" });
        response.json(result);
    }
    catch(error) {
        console.error("Failed to increase quantity of the product", error);
        response.status(500).json({ message: "Failed to increase quantity" });
    }
    finally {
        //END CONNECTION
        client.release();
    }     
};
exports.decrementItem = async (request, response) => {
    const userId = parseInt(request.session.user.id);
    const listId = parseInt(request.params.id);

    let client  = null;  
    try {  
        //OPEN CONNECTION    
        client = await pool.connect(); ;      
        //Service - TRANSACTION, decrement item query
        const result = await listService.removeItemByQuantity(client, userId, listId);     
        if(!result) return response.status(404).json({message: "Item not found"});    
        response.json(result);
    }
    catch(error) {    
        console.error("Failed to decrease quantity of the product", error);
        response.status(500).json({ message: "Failed to decrease quantity" });
    }
    finally {
        //END CONNECTION
        if (client) client.release();
    }
};
exports.deleteItem = async (request, response) => {
    const userId = parseInt(request.session.user.id);
    const listId = parseInt(request.params.id);  

    let client  = null;  
    try {  
        //OPEN CONNECTION    
        client = await pool.connect(); 
        //Query & Transaction
        await listService.deleteItem(client, userId, listId);   
        response.json({success: true});
    }
    catch(error) { 
        console.error("Failed to delete item:", error);
        response.status(500).json({ message: "Failed to delete item" });
    }
    finally {
        //END CONNECTION
        if (client) client.release();       
    }      
};