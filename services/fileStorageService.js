const fs = require('fs');
const path = require('path');
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary if credentials are provided in the environment variables
const isCloudinaryConfigured = !!(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
  console.log('Cloudinary storage service initialized.');
} else {
  console.log('Using local file storage service (No Cloudinary credentials provided).');
}

/**
 * Service class for file storage operations.
 * Ported from Spring Boot FileStorageService structure.
 */
class FileStorageService {
  /**
   * Stores a file (in Cloudinary if configured, else locally)
   * 
   * @param {Object} file The Express-multer file object
   * @param {string} directory The sub-directory/folder type (e.g. 'profilepictures', 'courses')
   * @returns {Promise<string>} The public URL of the stored file
   */
  async storeFile(file, directory) {
    return this.storeFileWithOptions(file, directory, {});
  }

  /**
   * Stores a file with additional options
   * 
   * @param {Object} file The Express-multer file object
   * @param {string} directory The sub-directory/folder type
   * @param {Object} options Additional options (e.g. transformations)
   * @returns {Promise<string>} The public URL of the stored file
   */
  async storeFileWithOptions(file, directory, options = {}) {
    if (!file) {
      throw new Error('File is missing');
    }

    if (!this.isValidFileExtension(file.originalname)) {
      throw new Error('Invalid file extension');
    }

    if (isCloudinaryConfigured) {
      try {
        const uploadOptions = {
          folder: directory,
          resource_type: 'auto',
          ...options
        };
        const result = await cloudinary.uploader.upload(file.path, uploadOptions);
        
        // Clean up local temporary file if it was saved on disk
        if (file.path && fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }

        return result.secure_url;
      } catch (error) {
        console.error('Cloudinary Upload Error:', error);
        throw new Error(`Cloudinary upload failed: ${error.message}`);
      }
    } else {
      // Local Storage Fallback
      try {
        const uploadDir = path.join(__dirname, '..', 'public', 'uploads', directory);
        
        // Ensure the directory exists
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }

        const ext = this.getFileExtension(file.originalname);
        const fileName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
        const targetPath = path.join(uploadDir, fileName);

        if (file.path) {
          // If multer saved it to a temp path, move it
          fs.renameSync(file.path, targetPath);
        } else if (file.buffer) {
          // If in-memory, write buffer
          fs.writeFileSync(targetPath, file.buffer);
        } else {
          throw new Error('No file path or buffer available');
        }

        return `/uploads/${directory}/${fileName}`;
      } catch (error) {
        console.error('Local File Storage Error:', error);
        throw new Error(`Local file storage failed: ${error.message}`);
      }
    }
  }

  /**
   * Deletes a file by its URL
   * 
   * @param {string} fileUrl The full URL of the file to delete
   * @returns {Promise<boolean>} true if deletion was successful, false otherwise
   */
  async deleteFile(fileUrl) {
    if (!fileUrl) return false;

    if (isCloudinaryConfigured && fileUrl.includes('res.cloudinary.com')) {
      const publicId = this.extractPublicId(fileUrl);
      return this.deleteFileByPublicId(publicId);
    } else {
      // Local file deletion
      try {
        // Extract local path from URL e.g. /uploads/profilepictures/filename.jpg
        const relativePath = fileUrl.replace(/^\//, ''); // strip leading slash
        const absolutePath = path.join(__dirname, '..', 'public', relativePath);
        
        if (fs.existsSync(absolutePath)) {
          fs.unlinkSync(absolutePath);
          return true;
        }
        return false;
      } catch (error) {
        console.error('Local file delete error:', error);
        return false;
      }
    }
  }

  /**
   * Deletes a file from Cloudinary by its public ID
   * 
   * @param {string} publicId The Cloudinary public ID
   * @returns {Promise<boolean>}
   */
  async deleteFileByPublicId(publicId) {
    if (!isCloudinaryConfigured || !publicId) return false;
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      return result.result === 'ok';
    } catch (error) {
      console.error('Cloudinary Delete Error:', error);
      return false;
    }
  }

  /**
   * Extracts the public ID from a Cloudinary URL
   * 
   * @param {string} cloudinaryUrl 
   * @returns {string} The public ID
   */
  extractPublicId(cloudinaryUrl) {
    if (!cloudinaryUrl) return '';
    try {
      // Example: https://res.cloudinary.com/demo/image/upload/v1570975253/sample.jpg
      // Or with folders: https://res.cloudinary.com/demo/image/upload/v1570975253/folder/sample.jpg
      const parts = cloudinaryUrl.split('/');
      const uploadIndex = parts.indexOf('upload');
      if (uploadIndex === -1) return '';
      
      // Skip "upload" and the version tag (e.g. "v1570975253") if present
      let startIdx = uploadIndex + 1;
      if (parts[startIdx].startsWith('v') && !isNaN(parts[startIdx].substring(1))) {
        startIdx++;
      }

      const pathParts = parts.slice(startIdx);
      const lastPart = pathParts[pathParts.length - 1];
      const dotIndex = lastPart.lastIndexOf('.');
      
      if (dotIndex !== -1) {
        pathParts[pathParts.length - 1] = lastPart.substring(0, dotIndex);
      }
      
      return pathParts.join('/');
    } catch (error) {
      console.error('Failed to extract public ID:', error);
      return '';
    }
  }

  /**
   * Validates if the file extension is allowed
   * 
   * @param {string} fileName 
   * @returns {boolean}
   */
  isValidFileExtension(fileName) {
    if (!fileName) return false;
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const ext = this.getFileExtension(fileName).toLowerCase();
    return allowedExtensions.includes(ext);
  }

  /**
   * Gets the file extension
   * 
   * @param {string} fileName 
   * @returns {string} The file extension (e.g. '.jpg')
   */
  getFileExtension(fileName) {
    if (!fileName) return '';
    return path.extname(fileName);
  }

  /**
   * Generates an optimized URL for serving through Cloudflare CDN (Cloudinary transformation helper)
   * 
   * @param {string} cloudinaryUrl 
   * @param {number} [width] 
   * @param {number} [height] 
   * @param {string} [quality='auto'] 
   * @returns {string} Optimized URL
   */
  getOptimizedUrl(cloudinaryUrl, width, height, quality = 'auto') {
    if (!isCloudinaryConfigured || !cloudinaryUrl.includes('res.cloudinary.com')) {
      return cloudinaryUrl; // Return unmodified if not Cloudinary
    }

    try {
      const publicId = this.extractPublicId(cloudinaryUrl);
      const options = {
        fetch_format: 'auto',
        quality: quality
      };

      if (width) options.width = width;
      if (height) options.height = height;
      if (width || height) options.crop = 'fill';

      return cloudinary.url(publicId, options);
    } catch (error) {
      console.error('Error generating optimized URL:', error);
      return cloudinaryUrl;
    }
  }

  // Legacy methods for backward compatibility (local file access)

  /**
   * Loads a file as a Resource (for local files only) - Deprecated
   * 
   * @deprecated Use standard public URL serving instead
   * @param {string} fileName 
   * @param {string} directory 
   * @returns {Object} { path: string, exists: boolean }
   */
  loadFileAsResource(fileName, directory) {
    const filePath = this.getFilePath(fileName, directory);
    return {
      path: filePath,
      exists: fs.existsSync(filePath)
    };
  }

  /**
   * Gets the full file path (for local files only) - Deprecated
   * 
   * @deprecated
   * @param {string} fileName 
   * @param {string} directory 
   * @returns {string} Absolute system path
   */
  getFilePath(fileName, directory) {
    return path.join(__dirname, '..', 'public', 'uploads', directory, fileName);
  }
}

// Export a singleton instance
module.exports = new FileStorageService();
