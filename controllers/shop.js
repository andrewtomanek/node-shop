const fs = require("fs");
const path = require("path");

const PDFDocument = require("pdfkit");
const Product = require("../models/product");
const Order = require("../models/order");

const ITEMS_PER_PAGE = 3;

exports.getProducts = async (req, res, next) => {
  const page = +req.query.page || 1;
  let cartItems;
  if (req.user) {
    cartItems = req.user.cart.items;
  } else {
    cartItems = null;
  }

  try {
    const listOfItems = await Product.find();
    const totalItems = await Product.find().countDocuments();
    const products = await Product.find()
      .skip((page - 1) * ITEMS_PER_PAGE)
      .limit(ITEMS_PER_PAGE);
    res.render("shop/product-list", {
      prods: products,
      productList: listOfItems,
      cartContent: cartItems,
      pageTitle: "Products",
      path: "/products",
      currentPage: page,
      hasNextPage: ITEMS_PER_PAGE * page < totalItems,
      hasPreviousPage: page > 1,
      nextPage: page + 1,
      previousPage: page - 1,
      lastPage: Math.ceil(totalItems / ITEMS_PER_PAGE),
    });
  } catch (err) {
    const error = new Error(err);
    error.httpStatusCode = 500;
    return next(error);
  }
};

exports.sortProducts = async (req, res, next) => {
  const page = +req.query.page || +req.body.currentPage;
  const sortMethod = req.body.sortMethod || "title";
  const obj = {};
  let cartItems;
  if (req.user) {
    cartItems = req.user.cart.items;
  } else {
    cartItems = null;
  }

  if (req.body.pickCategory) {
    obj.category = req.body.pickCategory;
  }
  const category = obj;

  try {
    const listOfItems = await Product.find();
    const totalItems = await Product.find(category).countDocuments();
    const products = await Product.find(category)
      .skip((page - 1) * ITEMS_PER_PAGE)
      .limit(ITEMS_PER_PAGE)
      .sort(sortMethod);
    res.render("shop/product-list", {
      prods: products,
      productList: listOfItems,
      cartContent: cartItems,
      pageTitle: "Products",
      path: "/products",
      currentPage: page,
      hasNextPage: ITEMS_PER_PAGE * page < totalItems,
      hasPreviousPage: page > 1,
      nextPage: page + 1,
      previousPage: page - 1,
      lastPage: Math.ceil(totalItems / ITEMS_PER_PAGE),
    });
  } catch (err) {
    const error = new Error(err);
    error.httpStatusCode = 500;
    return next(error);
  }
};

exports.getProduct = async (req, res, next) => {
  const prodId = req.params.productId;

  try {
    const product = await Product.findById(prodId);
    res.render("shop/product-detail", {
      product: product,
      pageTitle: product.title,
      path: "/products",
    });
  } catch (err) {
    const error = new Error(err);
    error.httpStatusCode = 500;
    return next(error);
  }
};

exports.getIndex = async (req, res, next) => {
  const page = +req.query.page || 1;

  try {
    const totalItems = await Product.find({ sale: true }).countDocuments();
    const products = await Product.find({ sale: true })
      .skip((page - 1) * ITEMS_PER_PAGE)
      .limit(ITEMS_PER_PAGE);
    res.render("shop/index", {
      prods: products,
      pageTitle: "Shop",
      path: "/",
      currentPage: page,
      hasNextPage: ITEMS_PER_PAGE * page < totalItems,
      hasPreviousPage: page > 1,
      nextPage: page + 1,
      previousPage: page - 1,
      lastPage: Math.ceil(totalItems / ITEMS_PER_PAGE),
    });
  } catch (err) {
    const error = new Error(err);
    error.httpStatusCode = 500;
    return next(error);
  }
};

exports.getCart = async (req, res, next) => {
  try {
    const user = await req.user.populate("cart.items.productId").execPopulate();
    const products = user.cart.items;
    const adminProducts = await Product.find();
    res.render("shop/cart", {
      path: "/cart",
      pageTitle: "Your Cart",
      products: products,
      adminProducts: adminProducts,
    });
  } catch (err) {
    const error = new Error(err);
    error.httpStatusCode = 500;
    return next(error);
  }
};

exports.postCart = async (req, res, next) => {
  const prodId = req.body.productId;
  const productQuantity = req.body.productQuantity;
  const newStockQuantity = req.body.stockQuantity - productQuantity;
  if (newStockQuantity < 0) {
    return res.redirect("/cart");
  }

  try {
    const product = await Product.findByIdAndUpdate(prodId, {
      stockQuantity: newStockQuantity,
    });
    req.user.addToCart(product, productQuantity);
    res.redirect("/cart");
  } catch (err) {
    const error = new Error(err);
    error.httpStatusCode = 500;
    return next(error);
  }
};

exports.changeCart = async (req, res, next) => {
  const prodId = req.body.productId;
  let productQuantity = req.body.productQuantity;
  const userProductsArray = req.user.cart.items;

  try {
    userProductsArray.forEach(async (p) => {
      if (p.productId == prodId) {
        let product = await Product.findById(p.productId);
        newQuantity = productQuantity - p.quantity;
        newStockQuantity = product.stockQuantity - newQuantity;
        if (newStockQuantity < 0) {
          newStockQuantity = product.stockQuantity;
          productQuantity = p.quantity;
        }
        product = await Product.findByIdAndUpdate(prodId, {
          stockQuantity: newStockQuantity,
        });
        req.user.modifyCart(product, productQuantity);
      }
    });
    res.redirect("/cart");
  } catch (err) {
    const error = new Error(err);
    error.httpStatusCode = 500;
    return next(error);
  }
};

exports.postCartAddOneProduct = async (req, res, next) => {
  const prodId = req.body.productId;

  try {
    const product = await Product.findById(prodId);
    newStockQuantity = product.stockQuantity - 1;
    req.user.addToCart(product);
    await Product.findByIdAndUpdate(prodId, {
      stockQuantity: newStockQuantity,
    });
    res.redirect("/cart");
  } catch (err) {
    const error = new Error(err);
    error.httpStatusCode = 500;
    return next(error);
  }
};

exports.postCartRemoveOneProduct = async (req, res, next) => {
  const prodId = req.body.productId;

  try {
    const product = await Product.findById(prodId);
    newStockQuantity = product.stockQuantity + 1;
    req.user.removeOneFromCart(product);
    await Product.findByIdAndUpdate(prodId, {
      stockQuantity: newStockQuantity,
    });
    res.redirect("/cart");
  } catch (err) {
    const error = new Error(err);
    error.httpStatusCode = 500;
    return next(error);
  }
};

exports.postCartDeleteProduct = async (req, res, next) => {
  const productQuantity = req.body.productQuantity;
  const prodId = req.body.productId;

  try {
    const product = await Product.findById(prodId);
    newStockQuantity = +product.stockQuantity + +productQuantity;
    await Product.findByIdAndUpdate(prodId, {
      stockQuantity: newStockQuantity,
    });
    req.user.removeFromCart(prodId);
    res.redirect("/cart");
  } catch (err) {
    const error = new Error(err);
    error.httpStatusCode = 500;
    return next(error);
  }
};

exports.postOrder = async (req, res, next) => {
  // Token is created using Checkout or Elements!
  // Get the payment token ID submitted by the form:
  let totalSum = 0;
  let totalQuantity = 0;

  try {
    const user = await req.user.populate("cart.items.productId").execPopulate();
    user.cart.items.forEach((p) => {
      totalSum += p.quantity * p.productId.price;
      totalQuantity += p.quantity;
    });
    const products = user.cart.items.map((i) => {
      return {
        quantity: i.quantity,
        productPrice: i.productPrice,
        product: { ...i.productId._doc },
      };
    });
    const order = new Order({
      user: {
        email: req.user.email,
        userId: req.user,
      },
      products: products,
      totalQuantity: totalQuantity,
      totalSum: totalSum,
    });
    order.save();
    req.user.clearCart();
    res.redirect("/orders");
  } catch (err) {
    const error = new Error(err);
    error.httpStatusCode = 500;
    return next(error);
  }
};

exports.stornoOrder = async (req, res, next) => {
  const userProductsArray = req.user.cart.items;

  try {
    userProductsArray.forEach(async (p) => {
      let prodId = p.productId;
      const product = await Product.findById(prodId);
      await Product.findByIdAndUpdate(prodId, {
        stockQuantity: product.stockQuantity + p.quantity,
      });
    });
    req.user.clearCart();
    res.redirect("/cart");
  } catch (err) {
    const error = new Error(err);
    error.httpStatusCode = 500;
    return next(error);
  }
};

exports.getOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ "user.userId": req.user._id });
    res.render("shop/orders", {
      path: "/orders",
      pageTitle: "Your Orders",
      orders: orders,
    });
  } catch (err) {
    const error = new Error(err);
    error.httpStatusCode = 500;
    return next(error);
  }
};

exports.getInvoice = async (req, res, next) => {
  const orderId = req.params.orderId;

  try {
    const order = await Order.findById(orderId);
    if (!order) {
      return next(new Error("No order found."));
    }
    if (order.user.userId.toString() !== req.user._id.toString()) {
      return next(new Error("Unauthorized"));
    }
    const invoiceName = "invoice-" + orderId + ".pdf";
    const invoicePath = path.join("data", "invoices", invoiceName);
    const pdfDoc = new PDFDocument();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      'inline; filename="' + invoiceName + '"'
    );
    pdfDoc.pipe(fs.createWriteStream(invoicePath));
    pdfDoc.pipe(res);

    pdfDoc.fontSize(26).text("FAKTURA", {
      underline: true,
    });
    pdfDoc.fontSize(26).text("                                ");

    pdfDoc.fontSize(26).text("________________________________");
    pdfDoc.fontSize(26).text("                                ");

    pdfDoc
      .fontSize(20)
      .text("Název položky             množství            cena");
    pdfDoc.fontSize(26).text("                                ");

    let totalPrice = 0;
    order.products.forEach((prod) => {
      totalPrice += prod.quantity * prod.product.price;
      pdfDoc.fontSize(26).text("_ _ _ _ _ _ _ _ _ _ _ _ _ _ _ ");
      pdfDoc.fontSize(26).text("                                ");
      pdfDoc
        .fontSize(16)
        .text(
          prod.product.title +
            "                             " +
            prod.quantity +
            "                             " +
            prod.product.price +
            "Kc"
        );
    });
    pdfDoc.fontSize(26).text("                                ");
    pdfDoc.fontSize(26).text("________________________________");
    pdfDoc.fontSize(26).text("                                ");

    pdfDoc.fontSize(20).text("Celková hodnota v Kc:  " + totalPrice);

    pdfDoc.end();

    res.render("shop/orders", {
      path: "/orders",
      pageTitle: "Your Orders",
      orders: orders,
    });
  } catch (err) {
    const error = new Error(err);
    error.httpStatusCode = 500;
    return next(error);
  }
};
