/**
 * Middleware to protect routes from unauthenticated users
 */
const isAuthenticated = (req, res, next) => {
  if (req.session && req.session.user) {
    return next();
  }
  
  // Set a flash error (simulated via query or session)
  req.session.errorMsg = 'Please log in to access this page.';
  res.redirect('/login');
};

/**
 * Middleware to restrict access to Admin role only (admin@gmail.com)
 */
const isAdmin = (req, res, next) => {
  if (req.session && req.session.user && req.session.user.role === 'admin') {
    return next();
  }
  
  // Forbidden access
  res.status(403).render('error', {
    title: '403 Forbidden',
    errorCode: 403,
    errorMessage: 'Access Denied: You do not have permissions to view this resource. The Admin Dashboard is locked for regular users.',
    user: req.session ? req.session.user : null
  });
};

/**
 * Middleware to prevent authenticated users from accessing login/register pages
 */
const isGuest = (req, res, next) => {
  if (req.session && req.session.user) {
    return res.redirect('/');
  }
  next();
};

module.exports = {
  isAuthenticated,
  isAdmin,
  isGuest
};
