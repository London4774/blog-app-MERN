import mongoose from 'mongoose';
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import User from './models/User.js';
import Post from './models/Post.js';

const uploadMiddleWare = multer({ dest: 'uploads/' });

const app = express();

const salt = bcrypt.genSaltSync(10);
const secret = 'asegwegggwg2328jhg243hp9s';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors({ credentials: true, origin: 'http://localhost:3000' }));
app.use(express.json());
app.use(cookieParser());
app.use('/uploads', express.static(path.join(__dirname, 'uploads/')));

// Middleware для проверки аутентификации
const protect = (req, res, next) => {
  const { token } = req.cookies;

  if (!token) {
    return res.status(401).json('Access denied');
  }

  jwt.verify(token, secret, (err, user) => {
    if (err) {
      return res.status(401).json('Invalid token');
    }
    req.user = user; // Декодированные данные из токена
    next();
  });
};

// Подключение к базе данных
await mongoose.connect(
  'mongodb+srv://admin:admin@cluster0.umhrk.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0'
);

// Маршрут регистрации
app.post('/register', async (req, res) => {
  const { username, password } = req.body;

  try {
    const userDoc = await User.create({
      username,
      password: await bcrypt.hash(password, salt),
      role: 'user', // Роль по умолчанию
    });
    res.json(userDoc);
  } catch (error) {
    res.status(400).json(error);
  }
});

// Маршрут логина
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const userDoc = await User.findOne({ username });

  if (!userDoc) {
    return res.status(400).json('User not found');
  }

  const passOk = bcrypt.compareSync(password, userDoc.password);

  if (passOk) {
    jwt.sign(
      { username, id: userDoc._id, role: userDoc.role }, // Включаем роль в токен
      secret,
      { expiresIn: '2h' },
      (err, token) => {
        if (err) throw err;
        res.cookie('token', token).json({
          id: userDoc._id,
          username,
          role: userDoc.role, // Возвращаем роль на фронтенд
        });
      }
    );
  } else {
    res.status(400).json('Wrong credentials');
  }
});

// Маршрут логаута
app.post('/logout', (req, res) => {
  res.cookie('token', '').json('ok');
});

// Маршрут для создания поста (для всех пользователей)
app.post(
  '/post',
  protect,  // Проверка аутентификации, чтобы все пользователи могли создавать посты
  uploadMiddleWare.single('file'),
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json('No file uploaded');
    }

    const { originalname, path: tempPath } = req.file;
    const ext = originalname.split('.').pop();
    const newPath = tempPath + '.' + ext;
    fs.renameSync(tempPath, newPath);

    const { title, summary, content } = req.body;
    const postDoc = await Post.create({
      title,
      summary,
      content,
      cover: newPath,
      author: req.user.id, // Привязываем пост к автору
    });
    res.json(postDoc);
  }
);

// Маршрут для получения всех постов
app.get('/post', async (req, res) => {
  res.json(
    await Post.find()
      .populate('author', ['username'])
      .sort({ createdAt: -1 })
      .limit(20)
  );
});

// Маршрут для получения поста по ID
app.get('/post/:id', async (req, res) => {
  const { id } = req.params;
  const PostDoc = await Post.findById(id).populate('author', ['username']);
  res.json(PostDoc);
});

// Запуск сервера
app.listen(4000, () => {
  console.log('Server is running on port 4000');
});
