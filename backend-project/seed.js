require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('./models/User');

const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI)
  .then(() => console.log('MongoDB connected for seeding'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

const seedUser = async () => {
  try {
    const email = 'sam@gmail.com';
    const password = '123';
    const name = 'sam';

    const existingUser = await User.findOne({ email });
    if (existingUser) {
        console.log('User already exists');
        process.exit(0);
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await User.create({ name, email, password: hashedPassword });
    console.log('User seeded successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding user:', error);
    process.exit(1);
  }
};

seedUser();
