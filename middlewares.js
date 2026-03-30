
//kept customized middleware in a separate file to separate authentication logic from route configuration 
//and keep app.js focused on application setup.
//Reusable across routes/files and Testing is easier

// Passes the logged-in user from the session to the views so pages can show user-specific content (e.g username)
// eg welcome "Nicola"
exports.attachUserToLocals = (request, response, next) => {
  response.locals.user = request.session.user;
  next();
};

// Middleware that ensures a user is logged in before accessing protected routes
exports.checkLoggedIn = (request, response, next) => {

    if (request.session.user) {
        next()

    }else{
        response.redirect("/login")

    } 
}
// middleware exports used to check if a user is logged in and if logged in will redirect the page 
//(registration)
exports.bypassLogin = (request, response, next) => {
    if (! request.session.user){
        next()
    }else{
        response.redirect('/')
    }
} 

//for captcha generate
function generateCaptcha(length = 5) {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let result = "";

    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return result;
}

exports.createCaptcha = (req, res, next) => {
    const captcha = generateCaptcha();

    req.session.captcha = captcha;
    res.locals.captcha = captcha;

    next();
};

exports.generateCaptchaValue = (length = 5) => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";

  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return result;
};

exports.regenerateCaptchaValue = (request) => {
    const captcha = exports.generateCaptchaValue();
    request.session.captcha = captcha;
    return captcha;    
}

exports.validateCaptcha = (request, response, next) => {
    const { captchaInput } = request.body;
    const isValid = captchaInput || captchaInput.trim.toUpperCase !== request.session.captcha;

    //Dynamically adds login or reigster to the render by removing "/" from path
    const view = request.path.slice(1);
    //console.log(view);

    //If invalid, regenerate captcha and render the current page (view, either login or register)
    if (!isValid) {
        return response.render(view, {
            error: "Incorrect captcha",
            captcha: exports.regenerateCaptchaValue(request)
        });
    }
    //Go to the next route handler
    next();    
}