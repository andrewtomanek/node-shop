const fs = require('fs');
const path = require('path');

const PDFDocument = require('pdfkit');

const mongoose = require('mongoose');

const fileHelper = require('../util/file');

const { validationResult } = require('express-validator');

const Product = require('../models/product');
const Order = require('../models/order');
const Archive = require('../models/archive');

exports.getAddProduct = (req, res, next) => {
  res.render('admin/edit-product', {
    pageTitle: 'Add Product',
    path: '/admin/add-product',
    editing: false,
    hasError: false,
    errorMessage: null,
    validationErrors: []
  });
};

exports.postAddProduct = (req, res, next) => {
  const title = req.body.title;
  const category = req.body.category;
  const stockQuantity = req.body.stockQuantity;
  const price = req.body.price;
  const sale = req.body.sale;
  const description = req.body.description;
  const image = req.file;
  if (!image) {
    return res.status(422).render('admin/edit-product', {
      pageTitle: 'Add Product',
      path: '/admin/add-product',
      editing: false,
      hasError: true,
      product: {
        title: title,
        category: category,
        stockQuantity: stockQuantity,
        price: price,
        sale: sale,
        description: description,
        imageUrl: imageUrl,
      },
      errorMessage: 'Attached file is not an image.',
      validationErrors: []
    });
  }
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    console.log(errors.array());
    return res.status(422).render('admin/edit-product', {
      pageTitle: 'Add Product',
      path: '/admin/add-product',
      editing: false,
      hasError: true,
      product: {
        title: title,
        category: category,
        stockQuantity: stockQuantity,
        price: price,
        sale: sale,
        description: description,
        imageUrl: imageUrl,
      },
      errorMessage: errors.array()[0].msg,
      validationErrors: errors.array()
    });
  }

  const imageUrl = image.path;

  const product = new Product({
    title: title,
    category: category,
    stockQuantity: stockQuantity,
    price: price,
    sale: sale,
    description: description,
    imageUrl: imageUrl,
  });
  product
    .save()
    .then(result => {
      console.log('Created Product');
      res.redirect('/admin/products');
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getEditProduct = (req, res, next) => {
  const editMode = req.query.edit;
  if (!editMode) {
    return res.redirect('/');
  }
  const prodId = req.params.productId;
  Product.findById(prodId)
    .then(product => {
      if (!product) {
        return res.redirect('/');
      }
      res.render('admin/edit-product', {
        pageTitle: 'Edit Product',
        path: '/admin/edit-product',
        editing: editMode,
        product: product,
        hasError: false,
        errorMessage: null,
        validationErrors: []
      });
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.postEditProduct = (req, res, next) => {
  const prodId = req.body.productId;
  const updatedTitle = req.body.title;
  const updatedStockQuantity = req.body.stockQuantity;
  const updatedCategory = req.body.category;
  const updatedPrice = req.body.price;
  const updatedSale= req.body.sale;
  const updatedDesc = req.body.description;
  const image = req.file;

  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(422).render('admin/edit-product', {
      pageTitle: 'Edit Product',
      path: '/admin/edit-product',
      editing: true,
      hasError: true,
      product: {
        _id: prodId,
        title: updatedTitle,
        category: updatedCategory,
        stockQuantity: updatedStockQuantity,
        price: updatedPrice,
        sale: updatedSale,
        description: updatedDesc
      },
      errorMessage: errors.array()[0].msg,
      validationErrors: errors.array()
    });
  }

  Product.findById(prodId)
    .then(product => {
      product.title = updatedTitle;
      product.category = updatedCategory;
      product.stockQuantity = updatedStockQuantity;
      product.price = updatedPrice;
      product.sale = updatedSale;
      product.description = updatedDesc;
      if (image) {
        fileHelper.deleteFile(product.imageUrl);
        product.imageUrl = image.path;
      }
      return product.save().then(result => {
        console.log('UPDATED PRODUCT!');
        res.redirect('/admin/products');
      });
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getProducts = (req, res, next) => {
  Product.find()
    .then(products => {
      res.render('admin/products', {
        prods: products,
        pageTitle: 'Admin Products',
        path: '/admin/products'
      });
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.deleteProduct = (req, res, next) => {
  const prodId = req.params.productId;
  Product.findById(prodId)
    .then(product => {
      if (!product) {
        return next(new Error('Product not found.'));
      }
      fileHelper.deleteFile(product.imageUrl);
      return Product.deleteOne({ _id: prodId});
    })
    .then(() => {
      console.log('DESTROYED PRODUCT');
      res.status(200).json({ message: 'Success!' });
    })
    .catch(err => {
      res.status(500).json({ message: 'Deleting product failed.' });
    });
};

exports.deleteOneOrder = (req, res, next) => {
 const orderId = req.body.orderId;
  Order.findById(orderId)
    .then(order => {
      if (!order) {
        return next(new Error('No order found.'));
      }
      return Order.deleteOne({ _id: orderId});
    })
    .then(() => {
      console.log(`DESTROYED ORDER ${orderId}`);
      res.redirect('/admin/admin-orders');
})
    .catch(err => {
      res.status(500).json({ message: 'Deleting order failed.' });
    });
};

exports.archiveOneOrder = (req, res, next) => {
    const orderId = req.body.orderId;
  Order.findById(orderId)
    .then(order => {
      if (!order) {
        return next(new Error('No order found.'));
      }
        const archive = new Archive({
        user: {
          email: order.user.email,
          userId: order._id
        },
        products: order.products,
        totalQuantity: order.totalQuantity,   
        totalSum: order.totalSum
      });
      return archive.save();
    })
    .then(() => {
      res.redirect('/admin/archive');
      return Order.deleteOne({ _id: orderId});
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
  };
  
  exports.archiveRemoveOne = (req, res, next) => {
    const orderId = req.body.orderId;
    Archive.findById(orderId)
    .then(order => {
      if (!order) {
        return next(new Error('No order found.'));
      }
      return Archive.deleteOne({ _id: orderId});
    })
    .then(() => {
      res.redirect('/admin/archive');
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
  };

exports.getAdminOrders = (req, res, next) => {
  Order.find()
    .then(orders => {
      res.render('admin/admin-orders', {
        path: '/admin/admin-orders',
        pageTitle: 'Your Orders',
        orders: orders
      });
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};


exports.getAdminInvoice = (req, res, next) => {
  const orderId = req.params.orderId;
  Order.findById(orderId)
    .then(order => {  
      if (!order) {
        return next(new Error('No order found.'));
      }
      // if (order.user.userId.toString() !== req.user._id.toString()) {
      //   return next(new Error('Unauthorized'));
      // }
      const invoiceName = 'invoice-' + orderId + '.pdf';
      const invoicePath = path.join('data', 'invoices', invoiceName);
      const pdfDoc = new PDFDocument();
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        'inline; filename="' + invoiceName + '"'
      );
      pdfDoc.pipe(fs.createWriteStream(invoicePath));
      pdfDoc.pipe(res);

      pdfDoc.fontSize(26).text('Invoice', {
        underline: true
      });
      pdfDoc.text('-----------------------');
      let totalPrice = 0;
      order.products.forEach(prod => {
        totalPrice += prod.quantity * prod.product.price;
        pdfDoc
          .fontSize(14)
          .text(
            prod.product.title +
              ' - ' +
              prod.quantity +
              ' x ' +
              '$' +
              prod.product.price
          );
      });
      pdfDoc.text('---');
      pdfDoc.fontSize(20).text('Total Price: $' + totalPrice);

      pdfDoc.end();
    })
    .catch(err => next(err));
};

exports.getArchiveInvoice = (req, res, next) => {
  const orderId = req.params.orderId;
   Archive.findById(orderId)
    .then(order => {  
      if (!order) {
        return next(new Error('No order found.'));
      }
      // if (order.user.userId.toString() !== req.user._id.toString()) {
      //   return next(new Error('Unauthorized'));
      // }
      const invoiceName = 'invoice-' + orderId + '.pdf';
      const invoicePath = path.join('data', 'invoices', invoiceName);
      const pdfDoc = new PDFDocument();
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        'inline; filename="' + invoiceName + '"'
      );
      pdfDoc.pipe(fs.createWriteStream(invoicePath));
      pdfDoc.pipe(res);

      pdfDoc.fontSize(26).text('Invoice', {
        underline: true
      });
      pdfDoc.text('-----------------------');
      let totalPrice = 0;
      order.products.forEach(prod => {
        totalPrice += prod.quantity * prod.product.price;
        pdfDoc
          .fontSize(14)
          .text(
            prod.product.title +
              ' - ' +
              prod.quantity +
              ' x ' +
              '$' +
              prod.product.price
          );
      });
      pdfDoc.text('---');
      pdfDoc.fontSize(20).text('Total Price: $' + totalPrice);

      pdfDoc.end();
    })
    .catch(err => next(err));
};

exports.getArchives = (req, res, next) => {
  Archive.find()
    .then(archive => {
      res.render('admin/archive', {
        path: '/admin/archive',
        pageTitle: 'Your Archives',
        archive: archive
      });
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};