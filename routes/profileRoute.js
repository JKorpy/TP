const express = require("express")
const router = express.Router();
const { getProfile, postProfile } = require("../controllers/profileController");

//Access Profile
router.get("/", getProfile);

//Update User information
router.post("/update", postProfile);

module.exports = router;