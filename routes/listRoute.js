const express = require("express")
const router = express.Router();
const { getList, incrementItem, decrementItem, deleteItem } = require('../controllers/listController');

//Access the Shopping List
router.get("/", getList);
//Increment Item
router.put("/:id/increase", incrementItem);
//Decrement Item
router.put("/:id/decrease", decrementItem);
//Delete Item
router.delete("/:id", deleteItem);

module.exports = router;