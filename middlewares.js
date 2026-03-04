
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
exports.checkLoggedIn = (request, response, next)=> {
    if (request.session.user){
        next()
    }else{
        response.redirect('/Login')
    }
}
// middleware exports used to check if a user is logged in and if logged in will redirect the page 
exports.bypassLogin = (request, response, next) => {
    if (! request.session.user){
        next()
    }else{
        response.redirect('/')
    }
} 


