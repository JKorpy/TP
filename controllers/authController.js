const { pool } = require("../model/db");
const queries = require("../model/queries");
const { regenerateCaptchaValue} = require('../middlewares');
const authService = require('../service/authService')(queries);

exports.getLogin = (request, response) => {
    let error = null;
    if (request.query.error === "session-expired") {
        error = "Your session has expired. Please log in again.";
    }
    response.render('login', { error, captcha: response.locals.captcha });
};
exports.postLogin = async (request, response) => {
  const { username, password }= request.body;
  let client  = null;  

  try {  
    //OPEN CONNECTION    
    client = await pool.connect(); 
    // Check if a user with the provided username exists in the database and return the user object
    const user = await authService.loginUser(client, username, password);

    //Checkpoint 1: User must not be null
    if(!user) {
      return response.render("login", {
        error: "Wrong credentials",
        captcha: regenerateCaptchaValue(request)
      });
    }

    // Store the logged in user details in the session so they remain authenticated
     request.session.user = {
     id: user.id,
     firstName: user.first_name,
     lastName: user.last_name,
     username: user.username,
     email: user.email,
     phone: user.phone,
     dob: user.date_of_birth
};

    // Clear captcha after successful login
    request.session.captcha = null;
    // Redirect to homepage after successful login
    response.redirect("/");

  } 
  catch (error) {
    console.error(error);
    response.status(500).json({ message: "Failed to process login" });

    return response.render("login", {
      error: "Server error",
      captcha: regenerateCaptchaValue(request)
    });
  }
  finally {
    // END CONNECTION
    if (client) client.release();
  }
};
exports.getRegister = (request, response) => {
  response.render("register", {
    error: null,
    captcha: response.locals.captcha
  });    
};
exports.postRegister = async (request, response) => {
  const userInfo = request.body;
  let client  = null;  
  try {  
    //OPEN CONNECTION    
    client = await pool.connect(); 
    //this hashes the password using bcrypt 
    const result = await authService.registerUser(client, userInfo, userInfo.password);
    //  Auto-login: create session
    request.session.user = {
      id: result.id,
      firstName: result.first_name,
      lastName: result.last_name,
      username: result.username,
      email: result.email,
      phone: result.phone,
      dob: result.date_of_birth
};
    //  Go straight to protected home page once registration credentials are correct(autologin)
    response.redirect("/");
  } 
  catch (error) {
    //Transaction
    console.error("Registration error: ",error);
    //Username error
    if (error.message === "Missing fields") {
      return response.render("register", {
        error: "Missing fields",
        captcha: regenerateCaptchaValue(request)
      });
    }
    else if (error.message === "Passwords do not match") {
      return response.render("register", {
      error: error.message,
      captcha: regenerateCaptchaValue(request)
      });
    }
    //Password Error
    else if (error.message === "Password must be at least 8 characters") {
      return response.render("register", {
        error: error.message,
        captcha: regenerateCaptchaValue(request)
      });
    }    
    //"Username already exists" - does not register - does not autologin
    else if (error.code === "23505") {
      return response.render("register", { 
        error: "Username already exists",
        captcha: regenerateCaptchaValue(request) 
      });
    }
    // Handle unexpected server errors during registration
    response.status(500).send("Error registering user");
  }
  finally {
    //END CONNECTION
    if (client) client.release();    
  }    
};
exports.logout = (request, response) => {
    request.session.destroy()
    response.clearCookie('manfra.io')
    response.redirect('/')    
};
