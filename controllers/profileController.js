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
        dob: request.session.user.dob && new Date(request.session.user.dob).toISOString().split("T")[0],
        password: ""
    };

    response.render("profile", {
        title: "Profile",
        user
    }); 
};
exports.postProfile = async (request, response) => {
    const updatedUser = {
        first_name: request.body.firstName,
        last_name: request.body.lastName,
        username: request.body.username,
        email: request.body.email,
        phone: request.body.phone,
        date_of_birth: request.body.dob,
        password_hash: await bcrypt.hash(request.body.password, 10),
        id: request.session.user.id
    };

    //update DB or session
    console.log(updatedUser); 

    let client  = null;  
    try {  
        //OPEN CONNECTION    
        client = await pool.connect();    
        //Service: transaction, update user details
        await profileService.updateUser(client, updatedUser);

        //Update and save new session

        //Output
        response.redirect('/profile');    
    }
    catch(err) {
        console.error("Failed to update user information", err);
        response.status(500).json({ message: "Failed to update user information" });
    }
    finally {
        //END CONNECTION
        if (client) client.release();       
    }   
};