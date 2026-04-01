const health = (req, res) => {
  res.json({ status: 'Notification Service is running' });
};

module.exports = {
  health,
};
