const express = require("express")
const router = express.Router();
const {getContact, postContact} = require("../controllers/contactController");

router.get("/", getContact);
router.post("/", postContact);

module.exports = router;
