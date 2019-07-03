const fs = require("fs");
const path = require("path");

const PDFDocument = require("pdfkit");
const Product = require("../models/product");
const Order = require("../models/order");

const ITEMS_PER_PAGE = 3;

exports.getProducts = (req, res, next) => {
  const page = +req.query.page || 1;
  let totalItems;

  Product.find()
    .countDocuments()
    .then(numProducts => {
      totalItems = numProducts;
      return Product.find()
        .skip((page - 1) * ITEMS_PER_PAGE)
        .limit(ITEMS_PER_PAGE);
    })
    .then(products => {
      res.render("shop/product-list", {
        prods: products,
        pageTitle: "Products",
        path: "/products",
        currentPage: page,
        hasNextPage: ITEMS_PER_PAGE * page < totalItems,
        hasPreviousPage: page > 1,
        nextPage: page + 1,
        previousPage: page - 1,
        lastPage: Math.ceil(totalItems / ITEMS_PER_PAGE)
      });
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.sortProducts = (req, res, next) => {
  const page = +req.query.page || +req.body.currentPage;
  const sortMethod = req.body.sortMethod || "title";
  const obj = {};
  if (req.body.pickCategory) {
    obj.category = req.body.pickCategory;
  }
  const category = obj;
  let totalItems;

  Product.find(category)
    .countDocuments()
    .then(numProducts => {
      totalItems = numProducts;
      return Product.find(category)
        .skip((page - 1) * ITEMS_PER_PAGE)
        .limit(ITEMS_PER_PAGE)
        .sort(sortMethod);
    })
    .then(products => {
      return res.render("shop/product-list", {
        prods: products,
        pageTitle: "Products",
        path: "/products",
        currentPage: page,
        hasNextPage: ITEMS_PER_PAGE * page < totalItems,
        hasPreviousPage: page > 1,
        nextPage: page + 1,
        previousPage: page - 1,
        lastPage: Math.ceil(totalItems / ITEMS_PER_PAGE)
      });
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getProduct = (req, res, next) => {
  const prodId = req.params.productId;
  Product.findById(prodId)
    .then(product => {
      res.render("shop/product-detail", {
        product: product,
        pageTitle: product.title,
        path: "/products"
      });
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getIndex = (req, res, next) => {
  const page = +req.query.page || 1;
  let totalItems;

  Product.find({ sale: true })
    .countDocuments()
    .then(numProducts => {
      totalItems = numProducts;
      return Product.find({ sale: true })
        .skip((page - 1) * ITEMS_PER_PAGE)
        .limit(ITEMS_PER_PAGE);
    })
    .then(products => {
      res.render("shop/index", {
        prods: products,
        pageTitle: "Shop",
        path: "/",
        currentPage: page,
        hasNextPage: ITEMS_PER_PAGE * page < totalItems,
        hasPreviousPage: page > 1,
        nextPage: page + 1,
        previousPage: page - 1,
        lastPage: Math.ceil(totalItems / ITEMS_PER_PAGE)
      });
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getCart = (req, res, next) => {
  req.user
    .populate("cart.items.productId")
    .execPopulate()
    .then(user => {
      const products = user.cart.items;
      Product.find().then(adminProducts => {
        res.render("shop/cart", {
          path: "/cart",
          pageTitle: "Your Cart",
          products: products,
          adminProducts: adminProducts
        });
      });
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.postCart = (req, res, next) => {
  const page = +req.body.currentPage;
  const prodId = req.body.productId;
  const productQuantity = req.body.productQuantity;
  const newStockQuantity = req.body.stockQuantity - productQuantity;
  if (newStockQuantity < 0) {
    return res.redirect("/cart");
  }
  Product.findByIdAndUpdate(prodId, { stockQuantity: newStockQuantity })
    .then(product => {
      const productPrice = product.price;
      return req.user.addToCart(product, productQuantity, productPrice);
    })
    .then(() => {
      let totalItems;

      Product.find()
        .countDocuments()
        .then(numProducts => {
          totalItems = numProducts;
          return Product.find()
            .skip((page - 1) * ITEMS_PER_PAGE)
            .limit(ITEMS_PER_PAGE);
        })
        .then(() => res.redirect("/cart"));
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.changeCart = (req, res, next) => {
  const prodId = req.body.productId;
  let productQuantity = req.body.productQuantity;
  const userProductsArray = req.user.cart.items;
  userProductsArray.forEach(p => {
    if (p.productId == prodId) {
      Product.findById(p.productId)
        .then(product => {
          newQuantity = productQuantity - p.quantity;
          newStockQuantity = product.stockQuantity - newQuantity;
          if (newStockQuantity < 0) {
            newStockQuantity = product.stockQuantity;
            productQuantity = p.quantity;
          }
        })
        .then(() =>
          Product.findByIdAndUpdate(prodId, { stockQuantity: newStockQuantity })
        )
        .then(product => {
          imageUrl = product.imageUrl;
          const productPrice = product.price;
          return req.user.modifyCart(product, productQuantity, productPrice);
        })
        .then(() => res.redirect("/cart"))
        .catch(err => {
          const error = new Error(err);
          error.httpStatusCode = 500;
          return next(error);
        });
    }
  });
};

exports.postCartAddOneProduct = (req, res, next) => {
  const prodId = req.body.productId;
  Product.findById(prodId)
    .then(product => {
      newStockQuantity = product.stockQuantity - 1;
      return req.user.addToCart(product);
    })
    .then(() => {
      res.redirect("/cart");
      return Product.findByIdAndUpdate(prodId, {
        stockQuantity: newStockQuantity
      });
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.postCartRemoveOneProduct = (req, res, next) => {
  const prodId = req.body.productId;
  Product.findById(prodId)
    .then(product => {
      newStockQuantity = product.stockQuantity + 1;
      return req.user.removeOneFromCart(product);
    })
    .then(() => {
      res.redirect("/cart");
      return Product.findByIdAndUpdate(prodId, {
        stockQuantity: newStockQuantity
      });
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.postCartDeleteProduct = (req, res, next) => {
  const productQuantity = req.body.productQuantity;
  const prodId = req.body.productId;
  Product.findById(prodId)
    .then(
      product => (newStockQuantity = +product.stockQuantity + +productQuantity)
    )
    .then(() =>
      Product.findByIdAndUpdate(prodId, { stockQuantity: newStockQuantity })
    )
    .then(() => {
      req.user.removeFromCart(prodId);
      return res.redirect("/cart");
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getCheckout = (req, res, next) => {
  req.user
    .populate("cart.items.productId")
    .execPopulate()
    .then(user => {
      const products = user.cart.items;
      let total = 0;
      products.forEach(p => {
        total += p.quantity * p.productId.price;
      });
      res.render("shop/checkout", {
        path: "/checkout",
        pageTitle: "Checkout",
        products: products,
        totalSum: total
      });
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.postOrder = (req, res, next) => {
  // Token is created using Checkout or Elements!
  // Get the payment token ID submitted by the form:
  let totalSum = 0;
  let totalQuantity = 0;

  req.user
    .populate("cart.items.productId")
    .execPopulate()
    .then(user => {
      user.cart.items.forEach(p => {
        totalSum += p.quantity * p.productId.price;
        totalQuantity += p.quantity;
      });

      const products = user.cart.items.map(i => {
        return {
          quantity: i.quantity,
          productPrice: i.productPrice,
          product: { ...i.productId._doc }
        };
      });
      const order = new Order({
        user: {
          email: req.user.email,
          userId: req.user
        },
        products: products,
        totalQuantity: totalQuantity,
        totalSum: totalSum
      });
      return order.save();
    })
    .then(() => res.redirect("/orders"))
    .then(() => req.user.clearCart())
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.stornoOrder = (req, res, next) => {
  const userProductsArray = req.user.cart.items;
  userProductsArray.forEach(p => {
    let prodId = p.productId;
    let productQuantity = p.quantity;
    Product.findById(prodId)
      .then(
        product => (newStockQuantity = product.stockQuantity + productQuantity)
      )
      .then(() =>
        Product.findByIdAndUpdate(prodId, { stockQuantity: newStockQuantity })
      )
      .catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
      });
  });

  req.user
    .clearCart()
    .then(() => {
      res.redirect("/cart");
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getOrders = (req, res, next) => {
  Order.find({ "user.userId": req.user._id })
    .then(orders => {
      res.render("shop/orders", {
        path: "/orders",
        pageTitle: "Your Orders",
        orders: orders
      });
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getInvoice = (req, res, next) => {
  const orderId = req.params.orderId;
  Order.findById(orderId)
    .then(order => {
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
        underline: true
      });
      pdfDoc.fontSize(26).text("                                ");

      pdfDoc.fontSize(26).text("________________________________");
      pdfDoc.fontSize(26).text("                                ");

      pdfDoc
        .fontSize(20)
        .text("Název položky             množství            cena");
      pdfDoc.fontSize(26).text("                                ");

      let totalPrice = 0;
      order.products.forEach(prod => {
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
    })
    .catch(err => next(err));
};
