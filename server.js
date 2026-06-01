require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const connectDB = require('./config/db');
const User = require('./models/User');

// Import Middleware
const upload = require('./middleware/upload');
const { isAuthenticated, isAdmin, isGuest } = require('./middleware/authMiddleware');

// Import Controllers
const authController = require('./controllers/authController');
const adminController = require('./controllers/adminController');

const app = express();

// Connect to MongoDB Atlas
connectDB().then(() => {
  // Seed admin profile once DB is connected
  seedAdminUser();
});

// Set EJS as Templating Engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Parsing Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve Static Files (CSS and local Uploads)
app.use(express.static(path.join(__dirname, 'public')));

// Configure Session Middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback_session_secret_xyz_123',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 // 1 day expiration
  }
}));

/**
 * Seeding Function: Ensures the primary admin profile exists
 */
async function seedAdminUser() {
  try {
    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@gmail.com').toLowerCase();
    
    // Check if the admin profile already exists
    const adminExists = await User.findOne({ email: adminEmail });
    
    if (!adminExists) {
      console.log('Seeding administrative profile...');
      
      const defaultPassword = process.env.ADMIN_PASSWORD || 'Admin@123';
      const defaultName = process.env.ADMIN_NAME || 'System Admin';
      const defaultContact = process.env.ADMIN_CONTACT || '9999999999';
      const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(defaultName)}&background=8c7853&color=fff&size=128`;

      const newAdmin = new User({
        name: defaultName,
        email: adminEmail,
        contact: defaultContact,
        password: defaultPassword,
        role: 'admin',
        profilePicture: defaultAvatar
      });

      await newAdmin.save();
      console.log('======================================================');
      console.log(`SUCCESS: Admin profile seeded successfully!`);
      console.log(`Credentials:`);
      console.log(`Email:    ${adminEmail}`);
      console.log(`Password: ${defaultPassword} (as configured in .env)`);
      console.log('======================================================');
    } else {
      console.log(`Admin profile verified: ${adminEmail} is active in DB.`);
    }
  } catch (err) {
    console.error('Failed to seed admin user:', err.message);
  }
}

/* ========================================================================= */
/*                               ROUTES                                      */
/* ========================================================================= */

/**
 * ROOT ROUTE (Homepage Dashboard)
 * Protected: Redirects to /login if not authenticated
 */
app.get('/', isAuthenticated, async (req, res) => {
  const user = req.session.user;
  const errorMsg = req.session.errorMsg || null;
  const successMsg = req.session.successMsg || null;
  
  // Clear alerts from session
  delete req.session.errorMsg;
  delete req.session.successMsg;

  try {
    let usersList = [];
    
    // If the logged-in user is an admin, fetch all other regular users
    if (user.role === 'admin') {
      usersList = await User.find({ role: 'user' }).sort({ createdAt: -1 });
    }

    res.render('index', {
      title: 'Home Dashboard',
      user,
      users: usersList,
      errorMsg,
      successMsg
    });
  } catch (error) {
    console.error('Home Route Error:', error);
    res.status(500).render('error', {
      title: 'Internal Server Error',
      errorCode: 500,
      errorMessage: 'An unexpected server error occurred loading the dashboard.',
      user
    });
  }
});

/**
 * GUEST ROUTES (Login and Registration page)
 * Protected: Redirects to homepage if already authenticated
 */
app.get('/login', isGuest, authController.getLoginRegister);
app.post('/auth/register', isGuest, upload.single('profilepicture'), authController.registerUser);
app.post('/auth/login', isGuest, authController.loginUser);
app.get('/auth/logout', authController.logoutUser);

/**
 * ADMINISTRATIVE ROUTES (Admin actions only)
 * Protected: Requires authenticated user with the 'admin' role
 */
app.post('/admin/update', isAuthenticated, isAdmin, adminController.updateUser);
app.post('/admin/delete/:id', isAuthenticated, isAdmin, adminController.deleteUser);

/**
 * 404 Page Not Found Handler
 */
app.use((req, res) => {
  res.status(404).render('error', {
    title: '404 Page Not Found',
    errorCode: 404,
    errorMessage: 'The page you are looking for does not exist or has been moved.',
    user: req.session ? req.session.user : null
  });
});

/**
 * Centralized Error Boundary Handler
 */
app.use((err, req, res, next) => {
  console.error('Global Error Handler:', err);
  
  // Handle multer limit errors or specific upload validation errors
  if (err instanceof require('multer').MulterError || err.message.includes('Invalid file type')) {
    req.session.errorMsg = err.message;
    return res.redirect('/login');
  }

  res.status(500).render('error', {
    title: 'Internal Server Error',
    errorCode: 500,
    errorMessage: err.message || 'An unexpected error occurred in the system application.',
    user: req.session ? req.session.user : null
  });
});

// Launch server on specified PORT
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running in development mode on port ${PORT}`);
  console.log(`Open http://localhost:${PORT} in your web browser`);
});
