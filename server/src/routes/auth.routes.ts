import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { STATIC_JWT_SECRET, extractTokenUserId } from '../middleware/auth.js';
import { dbService } from '../services/db.service.js';

const router = Router();

const dataDir = process.cwd().endsWith('server')
  ? path.resolve(process.cwd(), 'data')
  : path.resolve(process.cwd(), 'server/data');
const usersFile = path.join(dataDir, 'users.json');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

/**
 * Helper to safely read users.json
 */
function readUsersFromFile(): any[] {
  if (!fs.existsSync(usersFile)) return [];
  try {
    const content = fs.readFileSync(usersFile, 'utf-8');
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Registration Handler (supports both /signup and /register)
 */
async function handleSignup(req: Request, res: Response) {
  try {
    const { fullName, email, password, state, district, phoneNumber, phone, preferredLanguage } = req.body;

    // 1. Validation: Full Name
    if (!fullName || typeof fullName !== 'string' || !fullName.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Please provide your full name',
        message: 'Please provide your full name'
      });
    }

    // 2. Validation: Email Address
    if (!email || typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a valid email address',
        message: 'Please provide a valid email address'
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        error: 'Please enter a valid email address format (e.g. farmer@agricare.org)',
        message: 'Please enter a valid email address format (e.g. farmer@agricare.org)'
      });
    }

    // 3. Validation: Password
    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters long',
        message: 'Password must be at least 6 characters long'
      });
    }

    // 4. Duplicate Check: inspect usersFile and dbService
    const users = readUsersFromFile();
    const existingInFile = users.find((u: any) => u.email && u.email.trim().toLowerCase() === normalizedEmail);
    const existingInDb = await dbService.getUserByEmail(normalizedEmail);

    if (existingInFile || existingInDb) {
      return res.status(400).json({
        success: false,
        error: 'This email is already registered. Please sign in instead.',
        message: 'This email is already registered. Please sign in instead.'
      });
    }

    // 5. Create new User Record
    const resolvedPhone = (phone || phoneNumber || '').toString().trim();
    const newUser = {
      id: uuidv4(),
      fullName: fullName.trim(),
      email: normalizedEmail,
      phone: resolvedPhone,
      phoneNumber: resolvedPhone,
      state: (state || '').toString().trim(),
      district: (district || '').toString().trim(),
      preferredLanguage: preferredLanguage || 'en',
      role: 'farmer' as const,
      createdAt: new Date().toISOString()
    };

    // Save to users.json for fast legacy lookup
    users.push(newUser);
    try {
      fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
    } catch (fsErr) {
      console.warn('[auth.routes] Failed to update users.json:', fsErr);
    }

    // Save to unified dbService (local_db.json / Supabase)
    try {
      await dbService.createUser(newUser);
    } catch (dbErr) {
      console.warn('[auth.routes] Failed to persist user in dbService:', dbErr);
    }

    // Generate authenticated JWT Token
    const token = jwt.sign(
      { userId: newUser.id, email: newUser.email, fullName: newUser.fullName },
      STATIC_JWT_SECRET,
      { expiresIn: '365d' }
    );

    return res.status(201).json({
      success: true,
      token,
      user: newUser
    });

  } catch (err: any) {
    console.error('[auth.routes signup error]', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Internal server error during registration',
      message: err.message || 'Internal server error during registration'
    });
  }
}

/**
 * Login Handler (supports both /login and /signin)
 */
async function handleLogin(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    if (!email || typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Please enter your email address',
        message: 'Please enter your email address'
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const users = readUsersFromFile();
    let user = users.find((u: any) => u.email && u.email.trim().toLowerCase() === normalizedEmail);

    if (!user) {
      user = await dbService.getUserByEmail(normalizedEmail);
    }

    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'No account found with this email address. Please register an account first.',
        message: 'No account found with this email address. Please register an account first.'
      });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, fullName: user.fullName },
      STATIC_JWT_SECRET,
      { expiresIn: '365d' }
    );

    return res.status(200).json({
      success: true,
      token,
      user
    });

  } catch (err: any) {
    console.error('[auth.routes login error]', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Internal server error during login',
      message: err.message || 'Internal server error during login'
    });
  }
}

// Routes
router.post('/signup', handleSignup);
router.post('/register', handleSignup);
router.post('/login', handleLogin);
router.post('/signin', handleLogin);

router.get('/me', async (req: Request, res: Response) => {
  try {
    const users = readUsersFromFile();
    let activeUser = null;
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const rawToken = authHeader.replace('Bearer ', '').trim();
      const userId = extractTokenUserId(rawToken);
      if (userId) {
        activeUser = users.find((u: any) => u.id === userId || (u.email && u.email.toLowerCase() === userId.toLowerCase()));
        if (!activeUser) {
          activeUser = await dbService.getUserById(userId);
          if (!activeUser) {
            activeUser = await dbService.getUserByEmail(userId);
          }
        }
      }
    }

    const user = activeUser || users[0] || {
      id: 'farmer-primary-01',
      fullName: 'AgriCare Farmer',
      email: 'farmer@agricare.in',
      preferredLanguage: 'hi',
      role: 'farmer'
    };

    return res.status(200).json({ success: true, user });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err.message || 'Internal Server Error',
      message: err.message || 'Internal Server Error'
    });
  }
});

export const authRouter = router;
export default router;