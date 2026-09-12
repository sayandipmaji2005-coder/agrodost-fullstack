import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';
import { STATIC_JWT_SECRET, extractTokenUserId } from '../middleware/auth.js';

const router = Router();

const dataDir = process.cwd().endsWith('server')
  ? path.resolve(process.cwd(), 'data')
  : path.resolve(process.cwd(), 'server/data');
const usersFile = path.join(dataDir, 'users.json');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

router.post('/signup', (req, res) => {
  try {
    const { fullName, email, password, state, district, phoneNumber, preferredLanguage } = req.body;

    let users = [];
    if (fs.existsSync(usersFile)) {
      users = JSON.parse(fs.readFileSync(usersFile, 'utf-8'));
    }

    if (users.find((u: any) => u.email === email)) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const newUser = {
      id: Date.now().toString(),
      fullName,
      email,
      state,
      district,
      phoneNumber,
      preferredLanguage,
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));

    const token = jwt.sign(
      { userId: newUser.id, email: newUser.email, fullName: newUser.fullName },
      STATIC_JWT_SECRET,
      { expiresIn: '365d' }
    );

    return res.status(200).json({
      success: true,
      token,
      user: newUser
    });
  } catch (err: any) {
    return res.status(500).json({ message: err.message || 'Internal Server Error' });
  }
});

router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;
    let users = [];
    if (fs.existsSync(usersFile)) {
      users = JSON.parse(fs.readFileSync(usersFile, 'utf-8'));
    }

    const user = users.find((u: any) => u.email === email);
    if (!user) {
      return res.status(400).json({ message: 'User not found' });
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
    return res.status(500).json({ message: err.message || 'Internal Server Error' });
  }
});

router.get('/me', (req, res) => {
  try {
    let users: any[] = [];
    if (fs.existsSync(usersFile)) {
      users = JSON.parse(fs.readFileSync(usersFile, 'utf-8'));
    }

    let activeUser = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const rawToken = authHeader.replace('Bearer ', '').trim();
      const userId = extractTokenUserId(rawToken);
      if (userId) {
        activeUser = users.find((u: any) => u.id === userId || u.email === userId);
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
    return res.status(500).json({ message: err.message || 'Internal Server Error' });
  }
});

export const authRouter = router;
export default router;