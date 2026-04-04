module.exports = (queries) => ({
    updateUser: async (client, updatedUser) => {
        //Include Verification


        //TRANSACTION - update user information
        try {
            await client.query("BEGIN");
            await queries.updateUser(client, updatedUser);
            await client.query("COMMIT");
        }
        catch (error) {
            await client.query("ROLLBACK");
            throw error;
        }  
    },
});