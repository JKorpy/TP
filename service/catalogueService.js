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
    getCataloguePage: async(client, {search, sort, categoryFilter, brandFilter, currentPage}) => {
        //Initialisations
        const orderBy = sortOptions[sort] || "name ASC";
        const offset =  (currentPage - 1) * limit;

        //Execute queries at the same time
        //Get Catalouge information, and unique categories and brands.
        //Optimisation reason: rather than having each query wait one another,
        //the execution time should be based on slowest query rather than having it in total
        const [{products, totalProducts}, uniqueCategories, uniqueBrands] = await Promise.all([
            queries.getCatalogue(client, {search, categoryFilter, brandFilter, orderBy, limit, offset}),
            queries.getUniqueCategories(client),
            queries.getUniqueBrands(client),
        ]);

        //Calculate total pages 
        const totalPages = Math.ceil(totalProducts / limit);     
        
        return { products, totalProducts, totalPages, uniqueCategories, uniqueBrands};
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