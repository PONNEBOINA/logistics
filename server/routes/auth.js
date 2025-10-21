import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d';

// Signup
router.post('/signup', async (req, res) => {
  try {
    const { email, password, name, role, vehicleType } = req.body;
    console.log('[SIGNUP] Request body:', { email, name, role, vehicleType: vehicleType || 'not provided' });

    // Validate input
    if (!email || !password || !name || !role) {
      console.log('[SIGNUP] Validation failed: missing required fields');
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Block direct admin registration if an admin already exists (unless explicitly allowed)
    if (role.toUpperCase() === 'ADMIN') {
      const allowDirectAdminSignup = process.env.ALLOW_DIRECT_ADMIN_SIGNUP === 'true';
      const existingAdmin = await User.findOne({ role: 'ADMIN' });
      
      if (existingAdmin && !allowDirectAdminSignup) {
        console.log('[SIGNUP] Direct admin registration blocked - admin already exists');
        return res.status(403).json({ 
          error: 'Direct admin registration is not allowed. Only the existing admin can grant admin access.' 
        });
      }
      
      if (!existingAdmin) {
        console.log('[SIGNUP] First admin registration - will be set as Super Admin');
      } else if (allowDirectAdminSignup) {
        console.log('[SIGNUP] Direct admin registration allowed via environment variable');
      }
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log('[SIGNUP] User already exists:', email);
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Check if this is the first admin (Super Admin)
    const isFirstAdmin = role.toUpperCase() === 'ADMIN' && !(await User.findOne({ role: 'ADMIN' }));

    // Create new user
    console.log('[SIGNUP] Creating new user...');
    const user = new User({
      email,
      password,
      name,
      role: role.toUpperCase(),
      isSuperAdmin: isFirstAdmin, // First admin becomes Super Admin
      vehicleType: vehicleType || undefined, // Only set if provided
    });

    console.log('[SIGNUP] Saving user to database...');
    await user.save();
    console.log('[SIGNUP] User saved successfully:', user._id, isFirstAdmin ? '(Super Admin)' : '');

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    console.log('[SIGNUP] Token generated, sending response');
    // Return user data (without password)
    res.status(201).json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        isSuperAdmin: user.isSuperAdmin,
        approved: user.approved,
        is_active: user.is_active,
        vehicleType: user.vehicleType,
        created_at: user.created_at
      }
    });
  } catch (error) {
    console.error('[SIGNUP] Error occurred:', error);
    console.error('[SIGNUP] Error stack:', error.stack);
    console.error('[SIGNUP] Error name:', error.name);
    console.error('[SIGNUP] Error message:', error.message);
    res.status(500).json({ 
      error: 'Failed to create account',
      details: error.message 
    });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: user._id,
        email: user.email,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Return user data (without password)
    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        isSuperAdmin: user.isSuperAdmin,
        approved: user.approved,
        is_active: user.is_active,
        vehicleType: user.vehicleType,
        created_at: user.created_at
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
});

// Get current user (verify token)
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        isSuperAdmin: user.isSuperAdmin,
        approved: user.approved,
        is_active: user.is_active,
        vehicleType: user.vehicleType,
        created_at: user.created_at
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// Update user profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { name, is_active } = req.body;
    
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (name) user.name = name;
    if (typeof is_active !== 'undefined') user.is_active = is_active;

    await user.save();

    res.json({
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        isSuperAdmin: user.isSuperAdmin,
        approved: user.approved,
        is_active: user.is_active,
        vehicleType: user.vehicleType,
        created_at: user.created_at
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Approve driver (admin only)
router.put('/approve/:userId', authenticateToken, async (req, res) => {
  try {
    console.log('Approve request from user:', req.user.id);
    console.log('Target user ID:', req.params.userId);
    
    // Check if requester is admin
    const admin = await User.findById(req.user.id);
    console.log('Admin found:', admin ? admin.email : 'null', 'Role:', admin ? admin.role : 'null');
    
    if (!admin) {
      return res.status(404).json({ error: 'Admin user not found' });
    }
    
    if (admin.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Only admins can approve drivers' });
    }

    const user = await User.findById(req.params.userId);
    console.log('Target user found:', user ? user.email : 'null');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.approved = true;
    await user.save();
    console.log('User approved successfully:', user.email);

    res.json({
      message: 'Driver approved successfully',
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        approved: user.approved,
        vehicleType: user.vehicleType
      }
    });
  } catch (error) {
    console.error('Approve driver error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: 'Failed to approve driver', details: error.message });
  }
});

// Get all users (admin only)
router.get('/users', authenticateToken, async (req, res) => {
  try {
    // Check if requester is admin
    const admin = await User.findById(req.user.id);
    if (admin.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Only admins can view all users' });
    }

    const users = await User.find().select('-password');
    res.json({ users });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

// Get all admins (Super Admin only)
router.get('/admins', authenticateToken, async (req, res) => {
  try {
    const requester = await User.findById(req.user.id);
    
    if (requester.role !== 'ADMIN' || !requester.isSuperAdmin) {
      return res.status(403).json({ error: 'Only Super Admin can view all admins' });
    }

    const admins = await User.find({ role: 'ADMIN' }).select('-password').sort({ created_at: 1 });
    res.json({ admins });
  } catch (error) {
    console.error('Get admins error:', error);
    res.status(500).json({ error: 'Failed to get admins' });
  }
});

// Create new admin (Super Admin only)
router.post('/create-admin', authenticateToken, async (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    // Verify requester is Super Admin
    const requester = await User.findById(req.user.id);
    if (!requester || requester.role !== 'ADMIN' || !requester.isSuperAdmin) {
      console.log('[CREATE ADMIN] Access denied - not Super Admin');
      return res.status(403).json({ 
        error: 'Access denied. Only an existing Super Admin can add new admins.' 
      });
    }

    // Validate input
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Create new admin
    const newAdmin = new User({
      email,
      password,
      name,
      role: 'ADMIN',
      isSuperAdmin: false, // New admins are not Super Admins
    });

    await newAdmin.save();
    console.log('[CREATE ADMIN] New admin created by Super Admin:', requester.email);

    res.status(201).json({
      message: 'New admin created successfully',
      admin: {
        id: newAdmin._id,
        email: newAdmin.email,
        name: newAdmin.name,
        role: newAdmin.role,
        isSuperAdmin: newAdmin.isSuperAdmin,
        created_at: newAdmin.created_at
      }
    });
  } catch (error) {
    console.error('[CREATE ADMIN] Error:', error);
    res.status(500).json({ error: 'Failed to create admin', details: error.message });
  }
});

// Delete admin (Super Admin only)
router.delete('/admin/:adminId', authenticateToken, async (req, res) => {
  try {
    const requester = await User.findById(req.user.id);
    
    if (!requester || requester.role !== 'ADMIN' || !requester.isSuperAdmin) {
      return res.status(403).json({ error: 'Only Super Admin can delete admins' });
    }

    const adminToDelete = await User.findById(req.params.adminId);
    if (!adminToDelete) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    // Prevent deleting Super Admin
    if (adminToDelete.isSuperAdmin) {
      return res.status(403).json({ error: 'Cannot delete Super Admin' });
    }

    // Prevent deleting self
    if (adminToDelete._id.toString() === requester._id.toString()) {
      return res.status(403).json({ error: 'Cannot delete yourself' });
    }

    await User.findByIdAndDelete(req.params.adminId);
    console.log('[DELETE ADMIN] Admin deleted:', adminToDelete.email);

    res.json({ message: 'Admin deleted successfully' });
  } catch (error) {
    console.error('[DELETE ADMIN] Error:', error);
    res.status(500).json({ error: 'Failed to delete admin' });
  }
});

// Middleware to authenticate JWT token
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}

export default router;
