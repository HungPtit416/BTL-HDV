const express = require('express');
const cors = require('cors');
require('dotenv').config();

const healthRoutes = require('./routes/healthRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const { errorMiddleware } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3004;

app.use(cors());
app.use(express.json());

app.use(healthRoutes);
app.use('/api', notificationRoutes);

app.use(errorMiddleware);

app.listen(PORT, () => {
  console.log(` Notification Service running on http://localhost:${PORT}`);
  console.log(` Health check: http://localhost:${PORT}/health`);
});
