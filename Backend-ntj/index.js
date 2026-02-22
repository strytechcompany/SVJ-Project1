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
const Login = require('./models/Login'); // <-- ADD THIS

const app = express();
const PORT = 3000;

// Connect to MongoDB
connectDB();

// ✅ AUTO SEED DEFAULT LOGIN USER
const seedDefaultUser = async () => {
  try {
    const existing = await Login.findOne({ email: 'AkshayaGold@gmail.com' });
    if (!existing) {
      const user = new Login({
        email: 'AkshayaGold@gmail.com',
        password: '12345678',
      });
      await user.save();
      console.log('✅ Default user seeded: AkshayaGold@gmail.com / 12345678');
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

// Test route
app.get('/', (req, res) => {
  res.send('Hello from Node.js backend!');
});

app.listen(PORT, async () => {
  console.log(`Server running on http://localhost:${PORT}`);
  await seedDefaultUser(); // ✅ Auto-seed runs every time server starts
});
