require('dotenv').config(); 
const express = require('express');
const mongoose = require('mongoose');
const ShortUrl = require('./models/shortUrl');
const authenticate = require('./middleware/auth'); 
const User = require('./models/User');
const jwt = require('jsonwebtoken');
const path = require('path'); 
const app = express();

app.use(express.json());
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: false }));

mongoose.connect('mongodb://localhost/urlShortener', {
  useNewUrlParser: true, useUnifiedTopology: true
});


app.get('/', (req, res) => {
  res.send('Welcome to the URL shortener!');
});

const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);
app.get('/signup', (req, res) => {
  res.render('signup');
});

app.post('/api/auth/signup', async (req, res) => {
  const { email, password } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({ message: 'User already exists' });
  }

  try {
    const user = new User({ email, password });
    await user.save();
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.status(201).json({ message: 'User created successfully', token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to create user' });
  }
});


app.get('/login', (req, res) => {
  res.render('login');  
});


app.post('/shortUrls', authenticate, async (req, res) => {
  console.log("Request body:", req.body); 
  console.log("Full URL value:", req.body.full); 

  try {
    const shortUrl = await ShortUrl.create({ full: req.body.full });
    res.redirect('/');
  } catch (error) {
    console.error("Error creating short URL:", error);
    return res.status(500).json({ error: "Failed to create short URL" });
  }
});


app.get('/api/shortUrls', async (req, res) => {
  const shortUrls = await ShortUrl.find();
  console.log("Fetching short URLs:", shortUrls); 
  res.json(shortUrls); 
});


app.get('/:shortUrl', async (req, res) => {
  const shortUrl = await ShortUrl.findOne({ short: req.params.shortUrl });
  if (shortUrl == null) return res.sendStatus(404);

  shortUrl.clicks++;
  shortUrl.save();

  res.redirect(shortUrl.full);
});


app.use(express.static(path.join(__dirname, 'client/build')));


app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname + '/client/build/index.html'));
});

console.log("JWT Secret:", process.env.JWT_SECRET); 
app.listen(process.env.PORT || 3000, () => {
  console.log('Server is running on port 3000');
});
