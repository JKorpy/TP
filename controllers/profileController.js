const { pool } = require("../model/db");
const queries = require("../model/queries");
const profileService = require("../service/profileService")(queries);

exports.getProfile = (request, response) => {
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
    let client = null;

    const formUser = {
        firstName: request.body.firstName || request.session.user.firstName,
        lastName: request.body.lastName || request.session.user.lastName,
        username: request.body.username || request.session.user.username,
        email: request.body.email || request.session.user.email,
        phone: request.body.phone || request.session.user.phone,
        dob: request.body.dob || request.session.user.dob,
        password: ""
    };

    try {
        client = await pool.connect();

        const updatedUser = await profileService.updateUser(
            client,
            request.session.user.id,
            request.body
        );

        request.session.regenerate((err) => {
            if (err) {
                console.error("Failed to regenerate session", err);

                return response.render("profile", {
                    title: "Profile",
                    user: formUser,
                    error: "Failed to refresh session",
                    success: null
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
            user: formUser,
            error: err.message || "Failed to update user information",
            success: null
        });
    } finally {
        if (client) client.release();
    }
};