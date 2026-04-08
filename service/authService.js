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
        const firstName = userInfo.firstName?.trim();
        const lastName = userInfo.lastName?.trim();
        const username = userInfo.username?.trim();
        const email = userInfo.email?.trim();
        const confirmPassword = userInfo.confirmPassword?.trim();

        if (!firstName || !lastName || !username || !email || !password || !confirmPassword) {
        throw new Error("Missing fields");
        }

    if (password !== confirmPassword) {
    throw new Error("Passwords do not match");
        }

    if (password.length < 8) {
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
            throw error;
        }
    },
});