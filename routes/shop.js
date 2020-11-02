const path = require("path");

const express = require("express");

const shopController = require("../controllers/shop");
const isAuth = require("../middleware/is-auth");

const router = express.Router();

router.get("/", shopController.getIndex);

router.get("/products", shopController.getProducts);

router.get("/products/:productId", shopController.getProduct);

router.get("/cart", isAuth, shopController.getCart);

router.post("/cart", isAuth, shopController.postCart);

router.post("/products", isAuth, shopController.sortProducts);

router.post("/change-cart", isAuth, shopController.changeCart);

router.post("/cart-add-one-item", isAuth, shopController.addOneProduct);

router.post("/cart-remove-one-item", isAuth, shopController.removeOneProduct);

router.post("/cart-delete-item", isAuth, shopController.deleteProduct);

router.get("/orders", isAuth, shopController.getOrders);

router.get("/orders/:orderId", isAuth, shopController.getInvoice);

module.exports = router;
