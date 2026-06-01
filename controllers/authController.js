const User = require('../models/User');
const fileStorageService = require('../services/fileStorageService');

/**
 * Render the Login and Register Page
 */
exports.getLoginRegister = (req, res) => {
  const errorMsg = req.session.errorMsg || null;
  const successMsg = req.session.successMsg || null;
  
  // Clear alerts from session
  delete req.session.errorMsg;
  delete req.session.successMsg;

  res.render('login-register', {
    title: 'Login / Register',
    errorMsg,
    successMsg
  });
};

/**
 * Handle User Registration
 */
exports.registerUser = async (req, res) => {
  try {
    const { name, email, contact, password } = req.body;

    // Simple fields validation
    if (!name || !email || !contact || !password) {
      req.session.errorMsg = 'All fields are required.';
      return res.redirect('/login');
    }

    if (password.length < 6) {
      req.session.errorMsg = 'Password must be at least 6 characters long.';
      return res.redirect('/login');
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      req.session.errorMsg = 'Email is already registered. Please log in.';
      return res.redirect('/login');
    }

    // Handle Profile Picture
    let profilePictureUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=d6c5b3&color=78593e&size=128`;
    
    if (req.file) {
      try {
        // Upload the file using FileStorageService
        profilePictureUrl = await fileStorageService.storeFile(req.file, 'profilepictures');
      } catch (uploadError) {
        console.error('Profile picture upload failed, falling back to default:', uploadError);
        // Continue registration with the default avatar rather than failing
      }
    }

    // Determine Role: only admin@gmail.com is an admin, others are users
    const role = (email.toLowerCase() === 'admin@gmail.com') ? 'admin' : 'user';

    // Create new user in the database
    const newUser = new User({
      name,
      email,
      contact,
      password,
      profilePicture: profilePictureUrl,
      role
    });

    await newUser.save();

    req.session.successMsg = 'Registration successful! Please log in now.';
    res.redirect('/login');
  } catch (error) {
    console.error('Registration Error:', error);
    req.session.errorMsg = `Registration failed: ${error.message}`;
    res.redirect('/login');
  }
};

/**
 * Handle User Login
 */
exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      req.session.errorMsg = 'Please enter both email and password.';
      return res.redirect('/login');
    }

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      req.session.errorMsg = 'Invalid email or password.';
      return res.redirect('/login');
    }

    // Verify password
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      req.session.errorMsg = 'Invalid email or password.';
      return res.redirect('/login');
    }

    // Set user session
    req.session.user = {
      id: user._id,
      name: user.name,
      email: user.email,
      contact: user.contact,
      profilePicture: user.profilePicture,
      role: user.role
    };

    req.session.successMsg = 'Welcome back!';
    res.redirect('/');
  } catch (error) {
    console.error('Login Error:', error);
    req.session.errorMsg = `Login failed: ${error.message}`;
    res.redirect('/login');
  }
};

/**
 * Handle User Logout
 */
exports.logoutUser = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Session destroy error:', err);
    }
    res.redirect('/login');
  });
};
