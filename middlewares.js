exports.checkLoggedIn = (req, res, next)=> {
    if (req.session.user){
        next()
    }else{
        res.redirect('/Login')
    }
}

exports.bypassLogin = (req, res, next) => {
    if (! req.session.user){
        next()
    }else{
        res.redirect('/')
    }
}