const health = (req, res) => {
  res.json({ status: 'Payment Service is running' });
};

module.exports = {
  health,
};
