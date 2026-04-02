const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { PORT } = require('./config/constants');
const { protect } = require('./middleware/auth');
const { errorMiddleware } = require('./middleware/errorHandler');
const healthRoutes = require('./routes/healthRoutes');
const internalRoutes = require('./routes/internalRoutes');
const cartRoutes = require('./routes/cartRoutes');
const orderRoutes = require('./routes/orderRoutes');
const { startOrderAutoCancelJob } = require('./jobs/orderAutoCancelJob');

const app = express();

app.use(cors());
app.use(express.json());

app.use(healthRoutes);
app.use('/internal', internalRoutes);
app.use('/api', protect, cartRoutes);
app.use('/api', protect, orderRoutes);

app.use(errorMiddleware);

app.listen(PORT, () => {
  console.log(`Order Service running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  startOrderAutoCancelJob();
});
