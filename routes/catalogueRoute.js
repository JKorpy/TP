const express = require("express")
const router = express.Router();
const { getCatalogue, getProductModal, addToList} = require('../controllers/catalogueController');

// Get Product Catalouge
router.get("/", getCatalogue);
// Add product to shopping list
router.post("/add", addToList);
// Get Product Modal
router.get("/:id", getProductModal);

module.exports = router;