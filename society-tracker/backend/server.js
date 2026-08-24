const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const complaintsRoutes = require('./routes/complaints');
const noticesRoutes = require('./routes/notices');
const dashboardRoutes = require('./routes/dashboard');

const app = express();

app.use(cors());
app.use(express.json());

// Serve uploaded complaint photos statically, e.g. GET /uploads/169999-photo.jpg
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/complaints', complaintsRoutes);
app.use('/api/notices', noticesRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.get('/', (req, res) => res.json({ status: 'Society Maintenance Tracker API running' }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
