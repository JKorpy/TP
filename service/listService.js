module.exports = (queries) => ({
    addItemByQuantity: async (client, userId, listId) => {
        const current = await queries.getQuantity(client, { listId, userId });
        if (!current) return null;

        const newQuantity = current.quantity + 1;
        //TRANSACTION - add item by quantity
        try {
            await client.query("BEGIN");
            await queries.updateFromShoppingList(client, { userId, listId, quantity: newQuantity });
            await client.query("COMMIT");
            return await queries.getItem(client, {userId, listId});
        }
        catch (error) {
            await client.query("ROLLBACK");
            throw error;
        }
    },
    removeItemByQuantity: async (client, userId, listId) => {
        const current = await queries.getQuantity(client, { listId, userId });
        if (!current) return null;

        const newQuantity = current.quantity - 1;
        try {
            await client.query("BEGIN");
            //Delete Item if quantity reaches 0  
            if(newQuantity <= 0) {
                await queries.removeFromShoppingList(client, {userId, listId});
                await client.query("COMMIT");
                return {deleted: true };
            }   
            await queries.updateFromShoppingList(client, { userId, listId, quantity: newQuantity });
            await client.query("COMMIT");
            return await queries.getItem(client, { userId, listId });                   
        }
        catch (error) {
            await client.query("ROLLBACK");
            throw error;            
        }
    },
    deleteItem: async (client, userId, listId) => {
        try {
            await client.query("BEGIN");
            await queries.removeFromShoppingList(client, { userId, listId });
            await client.query("COMMIT");
        } catch (error) {
            await client.query("ROLLBACK");
            throw error;
        }
    },
});