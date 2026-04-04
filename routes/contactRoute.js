const express = require("express")
const router = express.Router();

router.get("/contact", (request, response) => {
    response.render("contact", {title: "Contact"});
});

module.exports = router;