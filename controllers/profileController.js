const bcrypt = require("bcrypt");
const { pool } = require("../model/db");
const queries = require("../model/queries");
const profileService = require("../service/profileService")(queries);

exports.getProfile = (request, response) => {
    console.log(request.session.user.dob);

    const user = {
        firstName: request.session.user.firstName,
        lastName: request.session.user.lastName,
        username: request.session.user.username,
        email: request.session.user.email,
        phone: request.session.user.phone,
        dob: request.session.user.dob &&
            new Date(request.session.user.dob).toISOString().split("T")[0],
        password: ""
    };

    let success = null;

    if (request.query.success === "1") {
        success = "Profile updated successfully";
    }

    response.render("profile", {
        title: "Profile",
        user,
        error: null,
        success
    });
};

exports.postProfile = async (request, response) => {
    const { password, confirmPassword, currentPassword } = request.body;

    if (
        !request.body.firstName ||
        !request.body.lastName ||
        !request.body.username ||
        !request.body.email ||
        !request.body.phone ||
        !request.body.dob
    ) {
        return response.render("profile", {
            title: "Profile",
            user: request.session.user,
            error: "Please fill in all fields"
        });
    }

    // Only run validation if user is trying to change password
    if (password && password.trim() !== "") {

        // 1. Check current password entered
        if (!currentPassword || currentPassword.trim() === "") {
            return response.render("profile", {
                title: "Profile",
                user: request.session.user,
                error: "Please enter your current password"
            });
        }

        let client = null;

        try {
            // Open DB connection
            client = await pool.connect();

            // Get current user from DB
            const existingUser = await queries.getUserById(
                client,
                request.session.user.id
            );

            if (!existingUser) {
                return response.status(404).send("User not found");
            }

            // Compare entered password with stored hash
            const passwordMatches = await bcrypt.compare(
                currentPassword,
                existingUser.password_hash
            );

            if (!passwordMatches) {
                return response.render("profile", {
                    title: "Profile",
                    user: request.session.user,
                    error: "Current password is incorrect"
                });
            }

        } catch (err) {
            console.error("Failed to verify current password", err);

            return response.render("profile", {
                title: "Profile",
                user: request.session.user,
                error: "Something went wrong. Please try again."
            });

        } finally {
            if (client) client.release();
        }

        // 2. Check new password matches confirm password
        if (password !== confirmPassword) {
            return response.render("profile", {
                title: "Profile",
                user: request.session.user,
                error: "Passwords do not match"
            });
        }

        // 3. Password length (same as register)
        if (password.length < 8) {
            return response.render("profile", {
                title: "Profile",
                user: request.session.user,
                error: "Password must be at least 8 characters"
            });
        }
    }

    const updatedUser = {
        first_name: request.body.firstName,
        last_name: request.body.lastName,
        username: request.body.username,
        email: request.body.email,
        phone: request.body.phone,
        date_of_birth: request.body.dob,
        id: request.session.user.id
    };

    if (request.body.password && request.body.password.trim() !== "") {
        updatedUser.password_hash = await bcrypt.hash(request.body.password, 10);
    }

    console.log(updatedUser);

    let client = null;

    try {
        client = await pool.connect();

        await profileService.updateUser(client, updatedUser);

        request.session.regenerate((err) => {
            if (err) {
                console.error("Failed to regenerate session", err);
                return response.status(500).json({
                    message: "Failed to refresh session"
                });
            }

            request.session.user = {
                id: updatedUser.id,
                firstName: updatedUser.first_name,
                lastName: updatedUser.last_name,
                username: updatedUser.username,
                email: updatedUser.email,
                phone: updatedUser.phone,
                dob: updatedUser.date_of_birth
            };

            response.redirect("/profile?success=1");
        });

    } catch (err) {
        console.error("Failed to update user information", err);

        return response.render("profile", {
            title: "Profile",
            user: {
                firstName: request.body.firstName || request.session.user.firstName,
                lastName: request.body.lastName || request.session.user.lastName,
                username: request.body.username || request.session.user.username,
                email: request.body.email || request.session.user.email,
                phone: request.body.phone || request.session.user.phone,
                dob: request.body.dob || request.session.user.dob,
                password: ""
            },
            error: "Failed to update user information"
        });

    } finally {
        if (client) client.release();
    }
};