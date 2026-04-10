const express = require("express")
const router = express.Router();
const { bypassLogin, createCaptcha,  validateCaptcha} = require('../middlewares');
const { getLogin, postLogin, getRegister, postRegister, logout} = require('../controllers/authController');

// Access Login Page
router.get("/login", bypassLogin, createCaptcha, getLogin);
// User enters register details
router.post("/login", validateCaptcha, postLogin);
// Access the Register Page
router.get("/register", bypassLogin, createCaptcha, getRegister);
// User enters register details
router.post("/register", validateCaptcha, postRegister)
// User logs out
router.get("/logout", logout);

module.exports = router;

//Routing
//Method -> Path -> Middleware -> Controller
