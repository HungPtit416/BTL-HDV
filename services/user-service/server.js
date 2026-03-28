const express = require('express');
const cors = require('cors');
require('dotenv').config();
const userRoutes = require('./routes/userRoutes');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => res.json({
  status: 'User Service is running',
  timestamp: new Date().toISOString()
}));

app.use('/api/users', userRoutes);

app.use((err, req, res, next) => {
  console.error('SERVER ERROR LOG:', err.stack);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal Server Error'
  });
});

app.listen(PORT, () => {
  console.log(` User Service running on http://localhost:${PORT}`);
  console.log(` Health check: http://localhost:${PORT}/health`);
});