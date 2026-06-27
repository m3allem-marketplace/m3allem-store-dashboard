const jwt = require('jsonwebtoken');

const customerAuth = (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'No authentication token, access denied.' });
    }

    // Verify token using the main backend's secret
    const verified = jwt.verify(token, process.env.CUSTOMER_JWT_SECRET);
    if (!verified) {
      return res.status(401).json({ message: 'Token verification failed, authorization denied.' });
    }

    // Attach verified customer info to request
    req.customer = verified;
    next();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = customerAuth;
