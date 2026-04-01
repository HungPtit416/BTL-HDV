const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { PORT } = require('./config/constants');
const { protect } = require('./middleware/auth');
const { errorMiddleware } = require('./middleware/errorHandler');
const { ensurePaymentSchema } = require('./services/paymentService');
const healthRoutes = require('./routes/healthRoutes');
const webhookRoutes = require('./routes/webhookRoutes');
const paymentRoutes = require('./routes/paymentRoutes');

const app = express();

app.use(cors());
app.use(
  express.json({
    verify: (req, _res, buf) => {
      if (req.originalUrl.includes('/api/payments/webhook/vietqr')) {
        req.rawBody = buf.toString('utf8');
      }
    },
  })
);

app.use(healthRoutes);
app.use('/api', webhookRoutes);
app.use('/api', protect, paymentRoutes);

app.use(errorMiddleware);

ensurePaymentSchema()
  .then(() => {
    app.listen(PORT, () => {
      console.log(` Payment Service running on http://localhost:${PORT}`);
      console.log(` Health check: http://localhost:${PORT}/health`);
    });
  })
  .catch((error) => {
    console.error('Failed to ensure payment schema:', error);
    process.exit(1);
  });
