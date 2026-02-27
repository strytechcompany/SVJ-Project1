require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./DB');
const { errorHandler } = require('./middleware/errorMiddleware');
const Login = require('./models/Login');

// Import Routes
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
const orderRoutes = require('./routes/Order');
const suspenseRoutes = require("./routes/SuspenseTransaction");
const dealerRoutes = require("./routes/Dealer");
const PurchaseRoutes = require("./routes/Purchase");
const deleteAllRoutes = require('./routes/deleteAll');
const paymentRoutes = require('./routes/payment');
const estimateRoutes = require("./routes/Estimate");
const gstRoutes = require('./routes/gst');
const upiRoutes = require('./routes/UPI');
const thirukkuralRoutes = require("./routes/Thirukkural");
const rateRoutes = require('./routes/Rate');
const loginRoutes = require('./routes/Login');
const billSummaryRoutes = require('./routes/billSummary');

// Initialize App
const app = express();
const PORT = process.env.PORT || 3000;

// Connect to Database
connectDB();

// Seeding Default User
const seedDefaultUser = async () => {
  try {
    const existing = await Login.findOne({ email: 'akshayagold@gmail.com' });
    if (!existing) {
      const user = new Login({
        email: 'akshayagold@gmail.com',
        password: '12345678', // Will be hashed by model pre-save hook
      });
      await user.save();
      console.log('✅ Default user seeded: akshayagold@gmail.com / 12345678');
    } else {
      console.log('✅ Default user already exists in DB');
    }
  } catch (err) {
    console.error('❌ Auto-seed error:', err.message);
  }
};

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes API
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
app.use('/api/orders', orderRoutes);
app.use("/api/suspense", suspenseRoutes);
app.use("/api/customersDealer", dealerRoutes);
app.use("/api/purchases", PurchaseRoutes);
app.use('/api/deleteAll', deleteAllRoutes);
app.use('/api/payments', paymentRoutes);
app.use("/api/estimates", estimateRoutes);
app.use('/api/gst', gstRoutes);
app.use('/api/upi', upiRoutes);
app.use("/api/thirukkural", thirukkuralRoutes);
app.use('/api/rates', rateRoutes);
app.use('/api/login', loginRoutes);
app.use('/api/billSummary', billSummaryRoutes);

// Base route
app.get('/', (req, res) => {
  res.send('NTJ Backend API is running...');
});

// Error Handler Middleware
app.use(errorHandler);

// Start Server
app.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}`);
  await seedDefaultUser();
});