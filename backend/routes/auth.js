const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../db');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });
    const user = await prisma.user.findFirst({ where: { email: String(email).toLowerCase().trim() }, include: { tenant: true } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) return res.status(401).json({ error: 'Invalid email or password.' });
    const token = jwt.sign({ id: user.id, tenantId: user.tenantId, name: user.name, email: user.email, role: user.role }, process.env.JWT_SECRET || 'dev_secret_change_me', { expiresIn: '12h' });
    res.json({ token, user: { id: user.id, tenantId: user.tenantId, name: user.name, email: user.email, role: user.role, tenant: user.tenant } });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Login failed.' }); }
});
router.get('/me', authenticate, async (req, res) => {
  const user = await prisma.user.findFirst({ where: { id: req.user.id, tenantId: req.tenantId }, select: { id:true,name:true,email:true,role:true,tenantId:true,tenant:true } });
  if (!user) return res.status(401).json({ error: 'User not found.' });
  res.json({ user });
});
router.get('/demo-credentials', (_req, res) => res.json({
  admin: { email: 'admin@bharatinfotechs.com', password: 'Admin@123' },
  client: { email: 'client@bharatinfotechs.com', password: 'Client@123' }
}));
module.exports = router;
