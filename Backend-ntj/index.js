const express = require('express');
const cors = require('cors');
const connectDB = require('./DB');
const userRoutes = require('./routes/user');
const itemRoutes = require('./routes/item');
const customerRoutes = require('./routes/Customer');
const customerB2CRoutes = require('./routes/CustomerB2C');
const stockMasterRoutes = require('./routes/stockMaster');
const issueEntryRoutes = require('./routes/issueEntry');
const receiptEntryRoutes = require('./routes/receiptEntry');
const cashReceivedRoutes = require('./routes/cashReceived');
const transactionRoutes = require('./routes/Transaction');
const b2ccalRoutes = require('./routes/B2Ccal');
const additemRoutes = require('./routes/AddItem');
const RetailTransactionRoutes = require("./routes/RetailTransaction");

const app = express();
const PORT = 3000;

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/users', userRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/customersB2C', customerB2CRoutes);
app.use('/api/stockMaster', stockMasterRoutes);
app.use('/api/issueEntries', issueEntryRoutes);
app.use('/api/receiptEntries', receiptEntryRoutes);
app.use('/api/cashReceived', cashReceivedRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/B2Ccal', b2ccalRoutes);
app.use('/api/addItem', additemRoutes);
app.use("/api/retail", RetailTransactionRoutes);

// Test route
app.get('/', (req, res) => {
  res.send('Hello from Node.js backend!');
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
