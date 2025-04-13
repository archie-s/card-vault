const requestLogger = (req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  console.log('Headers:', {
    authorization: req.headers.authorization ? 'Present' : 'Missing',
    'content-type': req.headers['content-type']
  });
  console.log('User:', req.user || 'Not authenticated');
  next();
};

module.exports = { requestLogger };