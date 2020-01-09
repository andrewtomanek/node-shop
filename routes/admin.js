const path = require("path");

const express = require("express");
const { body } = require("express-validator");

const adminController = require("../controllers/admin");
const isAuth = require("../middleware/is-admin-auth");

const router = express.Router();

// /admin/add-product => GET
router.get("/add-product", isAuth, adminController.getAddProduct);

// /admin/products => GET
router.get("/products", isAuth, adminController.getProducts);

// /admin/add-product => POST
router.post(
  "/add-product",
  [
    body("title")
      .isString()
      .isLength({ min: 3 })
      .trim(),
    body("price").isFloat(),
    body("description")
      .isLength({ min: 5, max: 140 })
      .trim()
  ],
  isAuth,
  adminController.postAddProduct
);

router.get("/edit-product/:productId", isAuth, adminController.getEditProduct);

router.post(
  "/edit-product",
  [
    body("title")
      .isString()
      .isLength({ min: 3 })
      .trim(),
    body("price").isFloat(),
    body("description")
      .isLength({ min: 5, max: 400 })
      .trim()
  ],
  isAuth,
  adminController.postEditProduct
);

router.delete("/product/:productId", isAuth, adminController.deleteProduct);

router.get("/admin-orders", isAuth, adminController.getAdminOrders);

router.post("/admin-orders", isAuth, adminController.deleteOneOrder);

router.post("/archive", isAuth, adminController.archiveOneOrder);

router.post("/archive-remove-one", isAuth, adminController.archiveRemoveOne);

router.get("/archive", isAuth, adminController.getArchives);

router.get("/admin-orders/:orderId", isAuth, adminController.getAdminInvoice);

router.get("/archive/:orderId", isAuth, adminController.getArchiveInvoice);

module.exports = router;
