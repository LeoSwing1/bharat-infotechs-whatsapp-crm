const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const prisma = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

const JWT_SECRET =
  process.env.JWT_SECRET || 'dev_secret_change_me';

function createToken(user) {
  return jwt.sign(
    {
      id: user.id,
      tenantId: user.tenantId,
      name: user.name,
      email: user.email,
      role: user.role,
    },
    JWT_SECRET,
    {
      expiresIn: '7d',
    }
  );
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

/**
 * LOGIN
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({
        error: 'Email and password are required.',
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    const user = await prisma.user.findFirst({
      where: {
        email: normalizedEmail,
      },
      include: {
        tenant: true,
      },
    });

    if (!user) {
      return res.status(401).json({
        error: 'Invalid email or password.',
      });
    }

    const valid = await bcrypt.compare(
      password,
      user.passwordHash
    );

    if (!valid) {
      return res.status(401).json({
        error: 'Invalid email or password.',
      });
    }

    const token = createToken(user);

    return res.json({
      token,
      user: {
        id: user.id,
        tenantId: user.tenantId,
        name: user.name,
        email: user.email,
        role: user.role,
        tenant: user.tenant
          ? {
              id: user.tenant.id,
              name: user.tenant.name,
              slug: user.tenant.slug,
            }
          : null,
      },
    });
  } catch (error) {
    console.error('Login error:', error);

    return res.status(500).json({
      error: 'Login failed.',
    });
  }
});

/**
 * REGISTER
 *
 * Creates a new tenant and its first admin user.
 */
router.post('/register', async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      companyName,
    } = req.body || {};

    if (!name || !email || !password || !companyName) {
      return res.status(400).json({
        error:
          'Name, email, password and company name are required.',
      });
    }

    if (String(password).length < 8) {
      return res.status(400).json({
        error: 'Password must be at least 8 characters.',
      });
    }

    const normalizedEmail = String(email)
      .trim()
      .toLowerCase();

    const tenantName = String(companyName).trim();

    let baseSlug = slugify(tenantName);

    if (!baseSlug) {
      baseSlug = 'company';
    }

    let slug = baseSlug;
    let counter = 1;

    while (
      await prisma.tenant.findUnique({
        where: { slug },
      })
    ) {
      counter += 1;
      slug = `${baseSlug}-${counter}`;
    }

    const passwordHash = await bcrypt.hash(
      String(password),
      12
    );

    const result = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: tenantName,
          slug,
        },
      });

      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          name: String(name).trim(),
          email: normalizedEmail,
          passwordHash,
          role: 'admin',
        },
      });

      return {
        tenant,
        user,
      };
    });

    const token = createToken(result.user);

    return res.status(201).json({
      token,
      user: {
        id: result.user.id,
        tenantId: result.user.tenantId,
        name: result.user.name,
        email: result.user.email,
        role: result.user.role,
        tenant: {
          id: result.tenant.id,
          name: result.tenant.name,
          slug: result.tenant.slug,
        },
      },
    });
  } catch (error) {
    console.error('Registration error:', error);

    return res.status(500).json({
      error: 'Registration failed.',
    });
  }
});

/**
 * CURRENT USER
 */
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findFirst({
      where: {
        id: req.user.id,
        tenantId: req.tenantId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        tenantId: true,
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(401).json({
        error: 'User not found.',
      });
    }

    return res.json({
      user,
    });
  } catch (error) {
    console.error('Me error:', error);

    return res.status(500).json({
      error: 'Unable to load user.',
    });
  }
});

/**
 * FORGOT PASSWORD
 *
 * Generates a secure one-time reset token.
 */
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body || {};

    if (!email) {
      return res.status(400).json({
        error: 'Email is required.',
      });
    }

    const normalizedEmail = String(email)
      .trim()
      .toLowerCase();

    const user = await prisma.user.findFirst({
      where: {
        email: normalizedEmail,
      },
    });

    /*
     * Always return the same response when the account
     * doesn't exist. This prevents email enumeration.
     */
    if (!user) {
      return res.json({
        message:
          'If an account exists for this email, a password reset link has been requested.',
      });
    }

    /*
     * Invalidate previous unused tokens.
     */
    await prisma.passwordResetToken.deleteMany({
      where: {
        userId: user.id,
        usedAt: null,
      },
    });

    const rawToken = crypto.randomBytes(32).toString('hex');

    const tokenHash = crypto
      .createHash('sha256')
      .update(rawToken)
      .digest('hex');

    const expiresAt = new Date(
      Date.now() + 30 * 60 * 1000
    );

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    /*
     * Until an email provider is configured, provide the
     * development reset URL only when explicitly enabled.
     */
    const resetUrl =
      `${process.env.FRONTEND_URL || 'http://localhost:5173'}` +
      `/reset-password/${rawToken}`;

    if (process.env.RESET_EMAIL_MODE === 'console') {
      console.log('PASSWORD RESET URL:', resetUrl);
    }

    return res.json({
      message:
        'If an account exists for this email, a password reset link has been requested.',
      ...(process.env.RESET_EMAIL_MODE === 'console'
        ? { resetUrl }
        : {}),
    });
  } catch (error) {
    console.error('Forgot password error:', error);

    return res.status(500).json({
      error: 'Unable to process password reset request.',
    });
  }
});

/**
 * RESET PASSWORD
 */
router.post('/reset-password/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body || {};

    if (!token || !password) {
      return res.status(400).json({
        error: 'Reset token and password are required.',
      });
    }

    if (String(password).length < 8) {
      return res.status(400).json({
        error: 'Password must be at least 8 characters.',
      });
    }

    const tokenHash = crypto
      .createHash('sha256')
      .update(String(token))
      .digest('hex');

    const resetToken =
      await prisma.passwordResetToken.findUnique({
        where: {
          tokenHash,
        },
        include: {
          user: true,
        },
      });

    if (!resetToken) {
      return res.status(400).json({
        error: 'Invalid or expired reset link.',
      });
    }

    if (
      resetToken.usedAt ||
      resetToken.expiresAt <= new Date()
    ) {
      return res.status(400).json({
        error: 'Invalid or expired reset link.',
      });
    }

    const passwordHash = await bcrypt.hash(
      String(password),
      12
    );

    await prisma.$transaction([
      prisma.user.update({
        where: {
          id: resetToken.userId,
        },
        data: {
          passwordHash,
        },
      }),

      prisma.passwordResetToken.update({
        where: {
          id: resetToken.id,
        },
        data: {
          usedAt: new Date(),
        },
      }),

      prisma.passwordResetToken.deleteMany({
        where: {
          userId: resetToken.userId,
          id: {
            not: resetToken.id,
          },
        },
      }),
    ]);

    return res.json({
      message:
        'Password reset successfully. You can now sign in.',
    });
  } catch (error) {
    console.error('Reset password error:', error);

    return res.status(500).json({
      error: 'Unable to reset password.',
    });
  }
});

/**
 * DEMO CREDENTIALS
 */
router.get('/demo-credentials', (req, res) => {
  res.json({
    admin: {
      email: 'admin@bharatinfotechs.com',
      password: 'Admin@123',
    },
    client: {
      email: 'client@bharatinfotechs.com',
      password: 'Client@123',
    },
  });
});

module.exports = router;