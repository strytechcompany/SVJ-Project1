require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');
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
const RetailTransactionRoutes = require('./routes/RetailTransaction');
const suspenseRoutes = require('./routes/SuspenseTransaction');
const dealerRoutes = require('./routes/Dealer');
const PurchaseRoutes = require('./routes/Purchase');
const deleteAllRoutes = require('./routes/deleteAll');
const paymentRoutes = require('./routes/payment');
const estimateRoutes = require('./routes/Estimate');
const upiRoutes = require('./routes/UPI');
const thirukkuralRoutes = require('./routes/Thirukkural');
const rateRoutes = require('./routes/Rate');
const loginRoutes = require('./routes/Login');
const billSummaryRoutes = require('./routes/billSummary');
const dailyExpenseRoutes = require('./routes/dailyExpense');
const whatsappRoutes = require('./routes/whatsapp');
const chitRoutes = require('./routes/chit');

// Initialize App
const app = express();
const PORT = process.env.PORT || 3000;

// Seeding Default User
const seedDefaultUser = async () => {
  try {
    // Seed legacy default user
    const existing = await Login.findOne({ email: 'akshayagold@gmail.com' });
    if (!existing) {
      const user = new Login({ email: 'akshayagold@gmail.com', password: '12345678' });
      await user.save();
      console.log('Default user seeded: akshayagold@gmail.com');
    }

    // Seed SVJ admin from .env — upsert so email/password changes in .env take effect
    const defaultEmail = (process.env.DEFAULT_EMAIL || 'srivaishnajeweller@gmail.com')
      .toLowerCase()
      .trim();
    const defaultPassword = process.env.DEFAULT_PASSWORD || '123456';
    const svjExists = await Login.findOne({ email: defaultEmail });
    if (!svjExists) {
      const svjUser = new Login({ email: defaultEmail, password: defaultPassword });
      await svjUser.save();
      console.log(`SVJ admin created: ${defaultEmail}`);
    } else {
      // Always sync the password from .env so a change in .env is applied on restart
      svjExists.password = defaultPassword;
      await svjExists.save();
      console.log(`SVJ admin password synced: ${defaultEmail}`);
    }
  } catch (err) {
    console.error('Auto-seed error:', err.message);
  }
};

// Middleware
app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));
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
app.use('/api/retail', RetailTransactionRoutes);
app.use('/api/suspense', suspenseRoutes);
app.use('/api/customersDealer', dealerRoutes);
app.use('/api/purchases', PurchaseRoutes);
app.use('/api/deleteAll', deleteAllRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/estimates', estimateRoutes);
app.use('/api/upi', upiRoutes);
app.use('/api/thirukkural', thirukkuralRoutes);
app.use('/api/rates', rateRoutes);
app.use('/api/login', loginRoutes);
app.use('/api/billSummary', billSummaryRoutes);
app.use('/api/dailyExpenses', dailyExpenseRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/chit', chitRoutes);

// Base route
app.get('/', (req, res) => {
  res.send('SVJ Backend API is running...');
});

// DB health / capacity snapshot
app.get('/api/health/db', async (req, res) => {
  try {
    if (!mongoose.connection?.db) {
      return res.status(503).json({ ok: false, message: 'Database not connected' });
    }
    const stats = await mongoose.connection.db.stats();
    const collections = await mongoose.connection.db
      .listCollections({}, { nameOnly: true })
      .toArray();
    const limitBytes =
      Number(process.env.DB_MAX_BYTES || process.env.MONGO_MAX_BYTES || 0) || null;
    const usedBytes = Number(stats.storageSize || stats.dataSize || 0);
    const usagePercent =
      limitBytes && limitBytes > 0
        ? Number(((usedBytes / limitBytes) * 100).toFixed(2))
        : null;

    res.json({
      ok: true,
      db: stats.db,
      collections: collections.length,
      objects: stats.objects,
      dataSizeBytes: stats.dataSize,
      storageSizeBytes: stats.storageSize,
      indexSizeBytes: stats.indexSize,
      fsUsedSizeBytes: stats.fsUsedSize,
      fsTotalSizeBytes: stats.fsTotalSize,
      estimatedLimitBytes: limitBytes,
      estimatedUsagePercent: usagePercent,
      message:
        usagePercent === null
          ? 'DB connected. Set DB_MAX_BYTES in .env to enable % usage estimate.'
          : `Estimated DB usage: ${usagePercent}%`,
    });
  } catch (err) {
    res.status(500).json({ ok: false, message: 'Failed to read DB stats', error: err.message });
  }
});

// Error Handler Middleware
app.use(errorHandler);

const startServer = async () => {
  try {
    await connectDB();

    // Bind to 0.0.0.0 so Expo Go on the phone can reach it over LAN.
    app.listen(PORT, '0.0.0.0', async () => {
      console.log(`Server running on http://0.0.0.0:${PORT} (LAN reachable)`);
      await seedDefaultUser();
    });
  } catch (error) {
    console.error('Server startup failed:', error.message);
    process.exit(1);
  }
};

startServer();
