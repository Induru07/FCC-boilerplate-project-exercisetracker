const express = require('express')
const app = express()
const cors = require('cors')
const mongoose = require('mongoose')
require('dotenv').config()


app.use(cors())
app.use(express.static('public'))
app.use(express.urlencoded({ extended: true })); // Important for parsing form data
app.use(express.json());
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

// 1. Database Connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// 2. Define Schemas & Models
const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
});

const exerciseSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, default: Date.now },
});


const User = mongoose.model('User', userSchema);
const Exercise = mongoose.model('Exercise', exerciseSchema);

// Home Route
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

// GET: Get all users
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}).select('_id username');
    res.json(users);
  } catch (err) {
    res.json({ error: err.message });
  }
});

// POST: Create a new user
app.post('/api/users', async (req, res) => {
  try {
    const newUser = new User({ username: req.body.username });
    const savedUser = await newUser.save();
    res.json({
      username: savedUser.username,
      _id: savedUser._id,
    });
  } catch (err) {
    res.json({ error: err.message });
  }
});

// POST: Add exercise
app.post('/api/users/:_id/exercises', async (req, res) => {
  const { _id } = req.params;
  const { description, duration, date } = req.body;

  try {
    const user = await User.findById(_id);
    if (!user) return res.send('User not found');

    // Handle date: if empty, use current date
    const exerciseDate = date ? new Date(date) : new Date();

    const newExercise = new Exercise({
      userId: _id,
      description,
      duration: parseInt(duration), // Ensure duration is a number
      date: exerciseDate,
    });

    const savedExercise = await newExercise.save();

    // The response must combine User info + Exercise info
    res.json({
      _id: user._id,
      username: user.username,
      date: savedExercise.date.toDateString(), // Required format
      duration: savedExercise.duration,
      description: savedExercise.description,
    });
  } catch (err) {
    res.json({ error: err.message });
  }
});

////////

// GET: Get user logs
app.get('/api/users/:_id/logs', async (req, res) => {
  const { _id } = req.params;
  const { from, to, limit } = req.query;

  try {
    const user = await User.findById(_id);
    if (!user) return res.send('User not found');

    // Build query object
    let dateObj = {};
    if (from) dateObj['$gte'] = new Date(from);
    if (to) dateObj['$lte'] = new Date(to);

    let filter = { userId: _id };
    if (from || to) {
      filter.date = dateObj;
    }

    // Fetch exercises with optional limit
    const exercises = await Exercise.find(filter).limit(parseInt(limit) || 500);

    // Map logs to required format
    const log = exercises.map((e) => ({
      description: e.description,
      duration: e.duration,
      date: e.date.toDateString(), // Required format
    }));

    res.json({
      _id: user._id,
      username: user.username,
      count: exercises.length,
      log: log,
    });
  } catch (err) {
    res.json({ error: err.message });
  }
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
