const bcrypt = require("bcrypt");

module.exports = (queries) => ({
    updateUser: async (client, sessionUserId, formData) => {
        const {
            firstName,
            lastName,
            username,
            email,
            phone,
            dob,
            currentPassword,
            password,
            confirmPassword
        } = formData;

        // Required fields
        if (
            !firstName ||
            !lastName ||
            !username ||
            !email ||
            !phone ||
            !dob
        ) {
            throw new Error("Please fill in all fields");
        }

        const updatedUser = {
            first_name: firstName,
            last_name: lastName,
            username,
            email,
            phone,
            date_of_birth: dob,
            id: sessionUserId
        };

        // Only validate password rules if user is changing password
        if (password && password.trim() !== "") {
            if (!currentPassword || currentPassword.trim() === "") {
                throw new Error("Please enter your current password");
            }

            const existingUser = await queries.getUserById(client, sessionUserId);

            if (!existingUser) {
                throw new Error("User not found");
            }

            const passwordMatches = await bcrypt.compare(
                currentPassword,
                existingUser.password_hash
            );

            if (!passwordMatches) {
                throw new Error("Current password is incorrect");
            }

            if (password !== confirmPassword) {
                throw new Error("Passwords do not match");
            }

            if (password.length < 8) {
                throw new Error("Password must be at least 8 characters");
            }

            updatedUser.password_hash = await bcrypt.hash(password, 10);
        }

        try {
            await client.query("BEGIN");
            await queries.updateUser(client, updatedUser);
            await client.query("COMMIT");

            return updatedUser;
        } catch (error) {
            await client.query("ROLLBACK");
            throw error;
        }
    }
});