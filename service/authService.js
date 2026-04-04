const bcrypt = require("bcrypt");

module.exports = (queries) => ({
    loginUser: async (client, username, password) => {
        const user = await queries.getUser(client, username);
        if(!user) return null;

        const match = await bcrypt.compare(password, user.password_hash);
        if(!match) return null;

        return user;
    },

    registerUser: async (client, userInfo, password) => {
        //Checkpoints: validate username, password and password length
        if(!userInfo.username || !password) {
            throw new Error("Missing fields");
        }
        if(password.length < 8) {
            throw new Error("Password must be at least 8 characters");
        }
        const hashedPassword = await bcrypt.hash(password, 10);

        //TRANSACTION - Create new user details
        try {
            await client.query("BEGIN");
            const result = await queries.registerUser(client, userInfo, hashedPassword);
            await client.query("COMMIT");
            return result;
        }
        catch (error) {
            await client.query("ROLLBACK");
            return error;
        }
    },
});