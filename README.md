# 🚚 Logistics Management System

A comprehensive logistics and delivery management platform with real-time tracking, admin controls, and driver management.

## 📋 Table of Contents
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [Project Structure](#project-structure)
- [API Documentation](#api-documentation)
- [Contributing](#contributing)

## ✨ Features

### 🔐 **Super Admin System**
- First admin becomes Super Admin automatically
- Create and manage multiple admin accounts
- Role-based access control
- Secure admin management dashboard

### 👥 **User Management**
- **Admin**: Manage drivers, vehicles, and bookings
- **Driver**: Accept bookings, track deliveries, manage profile
- **Customer**: Book vehicles, track deliveries, provide feedback

### 🚗 **Vehicle Management**
- 23 vehicle types supported
- Driver assignment based on vehicle type
- Real-time vehicle availability
- Active/inactive status management

### 📦 **Booking System**
- Real-time booking requests
- Distance and price calculation
- OTP verification for pickup
- Live tracking with maps
- Status management workflow

### 🗺️ **Real-Time Tracking**
- Live driver location tracking
- Route visualization
- Geolocation and address autocomplete
- Interactive maps with Leaflet

### ⭐ **Feedback System**
- Customer ratings (1-5 stars)
- Written feedback
- Driver performance tracking
- Average rating calculation

### 🔔 **Real-Time Notifications**
- Socket.IO integration
- Instant booking updates
- Driver assignment notifications
- Delivery status updates

## 🛠️ Tech Stack

### **Frontend**
- React 18 with TypeScript
- Vite for build tooling
- TailwindCSS for styling
- shadcn/ui components
- Leaflet for maps
- Socket.IO client

### **Backend**
- Node.js with Express
- MongoDB with Mongoose
- JWT authentication
- bcrypt for password hashing
- Socket.IO for real-time updates

### **APIs & Services**
- OpenStreetMap Nominatim (geocoding)
- Leaflet Routing Machine (route display)

## 📦 Installation

### **Prerequisites**
- Node.js (v18 or higher)
- MongoDB Atlas account or local MongoDB
- npm or yarn

### **Clone Repository**
```bash
git clone <your-repo-url>
cd lovable-logistics-53
```

### **Install Dependencies**

**Frontend:**
```bash
npm install
```

**Backend:**
```bash
cd server
npm install
```

## ⚙️ Configuration

### **Backend Environment Variables**

Create `server/.env` file:
```env
PORT=4001
CORS_ORIGIN=http://localhost:5173,http://localhost:8080
MONGODB_URI=your_mongodb_connection_string
TLS_INSECURE=true
JWT_SECRET=your-super-secret-jwt-key
ALLOW_DIRECT_ADMIN_SIGNUP=false
```

See `server/.env.example` for reference.

### **Frontend Environment Variables**

Create `.env` file in root:
```env
VITE_API_URL=http://localhost:4001
```

## 🚀 Usage

### **Development Mode**

**Start Backend:**
```bash
cd server
node index.js
```

**Start Frontend:**
```bash
npm run dev
```

**Access Application:**
- Frontend: http://localhost:8080
- Backend API: http://localhost:4001

### **First Time Setup**

1. **Create Super Admin:**
   - Go to signup page
   - Register as Admin (first admin becomes Super Admin)

2. **Create Additional Admins:**
   - Login as Super Admin
   - Go to "Manage Admins" tab
   - Click "Add New Admin"

3. **Add Drivers:**
   - Drivers sign up via signup page
   - Admin approves drivers in "Driver Requests" tab

4. **Add Vehicles:**
   - Admin creates vehicles in "Vehicles" tab
   - Assign drivers to vehicles

5. **Start Booking:**
   - Customers sign up and book vehicles
   - Admin confirms bookings
   - Drivers accept and complete deliveries

## 📁 Project Structure

```
lovable-logistics-53/
├── server/                 # Backend
│   ├── models/            # MongoDB models
│   ├── routes/            # API routes
│   ├── index.js           # Server entry point
│   └── .env               # Environment variables
├── src/                   # Frontend
│   ├── components/        # React components
│   ├── contexts/          # Context providers
│   ├── pages/             # Page components
│   ├── lib/               # Utilities
│   └── constants/         # Constants
├── public/                # Static assets
└── README.md             # This file
```

## 📚 API Documentation

### **Authentication**
- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `GET /api/auth/admins` - Get all admins (Super Admin only)
- `POST /api/auth/create-admin` - Create admin (Super Admin only)
- `DELETE /api/auth/admin/:id` - Delete admin (Super Admin only)

### **Bookings**
- `GET /api/bookings` - Get all bookings
- `POST /api/bookings` - Create booking
- `GET /api/bookings/driver/:id` - Get driver bookings
- `GET /api/bookings/customer/:id` - Get customer bookings
- `PATCH /api/bookings/:id` - Update booking
- `POST /api/bookings/:id/reached-pickup` - Generate OTP
- `POST /api/bookings/:id/verify-otp` - Verify OTP
- `POST /api/bookings/:id/mark-delivered` - Mark as delivered

### **Vehicles**
- `GET /api/vehicles` - Get all vehicles
- `POST /api/vehicles` - Create vehicle
- `PATCH /api/vehicles/:id` - Update vehicle
- `DELETE /api/vehicles/:id` - Delete vehicle

### **Feedback**
- `POST /api/feedback` - Submit feedback
- `GET /api/feedback/driver/:id` - Get driver feedback

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License.

## 👨‍💻 Author

Built with ❤️ using Lovable

## 🙏 Acknowledgments

- OpenStreetMap for geocoding services
- Leaflet for mapping functionality
- shadcn/ui for beautiful components

---

**Project URL**: https://lovable.dev/projects/58e95db0-1e3f-4e0e-9338-1c8e2af14506

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/58e95db0-1e3f-4e0e-9338-1c8e2af14506) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
