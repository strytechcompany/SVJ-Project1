const RetailTransaction = require("../models/RetailTransaction");
const createController = require("./genericController");

const retailTransactionController = createController(RetailTransaction);

module.exports = retailTransactionController;
