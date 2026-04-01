const health = (req, res) => {
  res.json({ status: 'Order Service is running' });
};

module.exports = {
  health,
};
