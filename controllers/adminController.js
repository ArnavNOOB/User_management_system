const User = require('../models/User');
const fileStorageService = require('../services/fileStorageService');

/**
 * Handle updating user details by Admin
 */
exports.updateUser = async (req, res) => {
  try {
    const { userId, name, email, contact } = req.body;

    if (!userId || !name || !email || !contact) {
      req.session.errorMsg = 'All fields are required to update a user.';
      return res.redirect('/');
    }

    // Check if the user exists
    const userToUpdate = await User.findById(userId);
    if (!userToUpdate) {
      req.session.errorMsg = 'User not found.';
      return res.redirect('/');
    }

    // Prevent modifying the admin user's email through this panel if needed, or keep standard checks
    if (userToUpdate.email === 'admin@gmail.com' && email !== 'admin@gmail.com') {
      req.session.errorMsg = 'Cannot change the system admin email.';
      return res.redirect('/');
    }

    // Check if new email is already taken by another user
    if (email.toLowerCase() !== userToUpdate.email.toLowerCase()) {
      const emailExists = await User.findOne({ email: email.toLowerCase() });
      if (emailExists) {
        req.session.errorMsg = 'Email is already taken by another user.';
        return res.redirect('/');
      }
    }

    // Update details
    userToUpdate.name = name;
    userToUpdate.email = email;
    userToUpdate.contact = contact;

    await userToUpdate.save();

    req.session.successMsg = `User "${name}" updated successfully!`;
    res.redirect('/');
  } catch (error) {
    console.error('Update User Error:', error);
    req.session.errorMsg = `Failed to update user: ${error.message}`;
    res.redirect('/');
  }
};

/**
 * Handle deleting a user by Admin
 */
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      req.session.errorMsg = 'User ID is required.';
      return res.redirect('/');
    }

    const userToDelete = await User.findById(id);
    if (!userToDelete) {
      req.session.errorMsg = 'User not found.';
      return res.redirect('/');
    }

    // Prevent deleting the admin account!
    if (userToDelete.role === 'admin' || userToDelete.email === 'admin@gmail.com') {
      req.session.errorMsg = 'Action Denied: You cannot delete the primary Admin account.';
      return res.redirect('/');
    }

    const userName = userToDelete.name;
    const profilePic = userToDelete.profilePicture;

    // Delete user from DB
    await User.findByIdAndDelete(id);

    // Clean up profile picture from storage if it is an uploaded file
    if (profilePic && !profilePic.includes('ui-avatars.com')) {
      try {
        await fileStorageService.deleteFile(profilePic);
      } catch (deleteError) {
        console.error(`Failed to delete profile picture file: ${profilePic}`, deleteError);
      }
    }

    req.session.successMsg = `User "${userName}" has been successfully deleted.`;
    res.redirect('/');
  } catch (error) {
    console.error('Delete User Error:', error);
    req.session.errorMsg = `Failed to delete user: ${error.message}`;
    res.redirect('/');
  }
};
