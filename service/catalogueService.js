//Sort parameters
const sortOptions = {
    ascending: "name ASC",
    descending: "name DESC",
    lowPrice: "price ASC",
    highPrice: "price DESC"
}
// Limit parameter
const limit = 24;

module.exports = (queries) => ({
    getCataloguePage: async(client, {search, sort, categoryFilter, currentPage}) => {
        //Initialisations
        const orderBy = sortOptions[sort] || "name ASC";
        const offset =  (currentPage - 1) * limit;

        //Search the products and total number of products
        const {products, totalProducts} = await queries.getCatalogue(client, {
        search, categoryFilter, orderBy, limit, offset
        });
        //Get the unique categories
        const uniqueCategories = await queries.getUniqueCategories(client);

        //Calculate total pages 
        const totalPages = Math.ceil(totalProducts / limit);     
        
        return { products, totalProducts, totalPages, uniqueCategories};
    },

    addProductToList: async(client, {userId, productId}) => {
        //Get Product information
        const productResult = await queries.getProduct(client, productId);

        //TRANSACTION - add products to list
        try {
            await client.query("BEGIN");  
            await queries.addToShoppingList(client, {userId, productId});
            await client.query("COMMIT");
            return productResult;
        }
        catch (error) {
            await client.query("ROLLBACK");
            return error;
        }
        
    },
});