const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('[AUTH] login attempt for', email);
    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(401).json({ message: 'Invalid email or password' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ message: 'Invalid email or password' });

    const secret = process.env.JWT_SECRET || 'dev-secret';
    if (!process.env.JWT_SECRET) {
      console.warn('WARNING: JWT_SECRET is not set. Using fallback development secret. Set JWT_SECRET in .env for production.');
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      secret,
      { expiresIn: '8h' }
    );

    console.log('[AUTH] login success for', email, 'id', user.id);
    return res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
  } catch (err) {
    console.error('Login handler error:', err);
    return res.status(500).json({ message: err.message || 'Internal server error' });
  }
};
