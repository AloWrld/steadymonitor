// backend/middleware/normalizeCustomer.js
module.exports = function normalizeCustomer(req, res, next) {
    // Normalize customer ID
    req.customerId =
      req.params.customerId ||
      req.params.learnerId ||
      req.params.id ||
      req.body.customerId ||
      req.body.learnerId ||
      req.body.id ||
      null;
  
    // Normalize customer name
    if (req.body) {
      req.body.customer_name =
        req.body.customer_name ||
        req.body.customerName ||
        req.body.name ||
        null;
    }
  
    next();
  };
  