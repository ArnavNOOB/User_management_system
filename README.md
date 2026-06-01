# Geeknito User Management System (Node.js & Express)

A secure, minimal user directory portal built with **Node.js, Express.js, MongoDB Atlas, and Bootstrap 5**. This system features dual-role access control (Admin vs User), dynamic rendering via EJS templating, secure password hashing, and a robust file storage service supporting local disk storage and Cloudinary integration.

---

## 🎨 Theme & Layout
Adhering to the requested design specifications, the layout incorporates a **basic, minimal Bootstrap aesthetic** centered around a **warm, muted beige theme** (`#f4efe6` page background, elegant bronze buttons, and white card containers) for a clean, premium, and clutter-free user experience.

---

## 📂 Project Structure
```
c:/Arnav/User_management_system/
├── config/
│   └── db.js                 # Database configuration using Mongoose ODM
├── controllers/
│   ├── adminController.js    # Administrative actions (profile updates & deletions)
│   └── authController.js     # Authentication routes (login, register, logout)
├── middleware/
│   ├── authMiddleware.js     # Protects routes and verifies roles (Admin vs Guest vs User)
│   └── upload.js             # Multer configurations for validating image file uploads
├── models/
│   └── User.js               # User Schema with validation pre-save password hashing
├── public/
│   ├── css/
│   │   └── style.css         # Beige custom color system & layouts
│   └── uploads/              # Storage directory for local profile picture uploads
│       └── profilepictures/  # Sub-folder where uploaded profile images are saved
├── services/
│   └── fileStorageService.js # File storage service matching Java Spring Boot API specifications
├── views/
│   ├── error.ejs             # Friendly error pages (such as 403 Forbidden panels)
│   ├── index.ejs             # Homepage (Dashboard for Admin / Account Card for normal User)
│   └── login-register.ejs    # Login and Registration tabbed forms
├── .env                      # Application environment configurations
├── package.json              # Express and service dependencies
└── server.js                 # Central application bootstrap and seeding script
```

---

## 🛠️ Installation & Setup

### 1. Prerequisites
Ensure you have [Node.js](https://nodejs.org/) (v16 or higher) installed on your system.

### 2. Configure MongoDB Atlas DB Connection
To connect the application to your database:
1. Head over to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and log in.
2. Under your project, create a new free shared database cluster.
3. Click **Connect** -> Choose **Drivers (Node.js)** -> Copy the connection URI string.
4. Open the `.env` file located in the root of the project directory.
5. Replace the placeholder in the line `MONGODB_URI` with your copied string:
   ```env
   MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.abcde.mongodb.net/user_management?retryWrites=true&w=majority
   ```
   *Make sure to replace `<username>` and `<password>` with the actual database credentials you created in the Database Access panel on Atlas.*

### 3. Review Admin Credentials
Upon start, the database seeds the sole admin account:
* **Admin Email**: `admin@gmail.com`
* **Admin Default Password**: `Admin@123` (You can modify this inside the `.env` file before booting up)

---

## 🚀 Running the Application

1. Open your terminal inside the project directory (`c:\Arnav\User_management_system`).
2. Boot up the server in development mode:
   ```bash
   node server.js
   ```
3. Once the database connection is successfully established, you will see a message:
   ```
   Successfully connected to MongoDB Atlas: cluster0-shard-xxx.mongodb.net/user_management
   SUCCESS: Admin profile seeded successfully!
   Credentials:
   Email:    admin@gmail.com
   Password: Admin@123
   
   Server is running in development mode on port 3000
   Open http://localhost:3000 in your web browser
   ```
4. Access the web interface at **[http://localhost:3000](http://localhost:3000)**.

---

## 🛡️ Key System Architecture Features

### 1. Spring Boot File Storage Service Translation
The service `services/fileStorageService.js` bridges the gap and implements the exact interface and methods requested in your Java architecture outline:
- **Dual Storage Engine**: Saves uploaded images locally inside `public/uploads/profilepictures` by default. If `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` keys are supplied in the `.env` file, the engine automatically routes uploads to the Cloudinary API.
- **Safety Filters**: The `isValidFileExtension` method filters out non-image files, rejecting script uploads.
- **Garbage Collection**: The `deleteFile` and `deleteFileByPublicId` methods clean up files from your local disk or Cloudinary when accounts are deleted by the administrator, saving server storage space.

### 2. Access Protection & Role Lockdown
- **Directory Lockdown**: Standard users can log in, edit their profiles, and read their own metrics. Attempting to navigate to administrative API actions or access the dashboard lists yields a `403 Forbidden` response utilizing `middleware/authMiddleware.js`.
- **Primary Admin Shield**: The main admin profile `admin@gmail.com` is protected inside the controller. The administrative dashboard blocks deleting the primary `admin@gmail.com` profile, securing the platform from accidental lockout.
