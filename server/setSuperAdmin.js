import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';

dotenv.config();

const makeSuperAdmin = async () => {
  try {
    console.log('Connecting to MongoDB...');
    
    await mongoose.connect(process.env.MONGODB_URI, {
      tls: true,
      tlsAllowInvalidCertificates: process.env.TLS_INSECURE === 'true',
    });

    console.log('Connected to MongoDB successfully!\n');

    // Find all admins
    const admins = await User.find({ role: 'ADMIN' }).sort({ created_at: 1 });
    
    console.log(`📊 Found ${admins.length} admin(s):\n`);
    
    admins.forEach((admin, index) => {
      console.log(`${index + 1}. ${admin.name} (${admin.email})`);
      console.log(`   - ID: ${admin._id}`);
      console.log(`   - Super Admin: ${admin.isSuperAdmin ? '✅ YES' : '❌ NO'}`);
      console.log(`   - Created: ${admin.created_at}`);
      console.log('');
    });

    // Make the first admin Super Admin
    if (admins.length > 0) {
      const firstAdmin = admins[0];
      
      if (!firstAdmin.isSuperAdmin) {
        console.log(`\n🔧 Making ${firstAdmin.name} (${firstAdmin.email}) a Super Admin...`);
        firstAdmin.isSuperAdmin = true;
        await firstAdmin.save();
        console.log('✅ Done! This admin is now a Super Admin.\n');
      } else {
        console.log(`\n✅ ${firstAdmin.name} is already a Super Admin.\n`);
      }

      console.log('📋 Instructions:');
      console.log('1. Logout from the admin dashboard');
      console.log('2. Login again with:');
      console.log(`   Email: ${firstAdmin.email}`);
      console.log('3. You should now see the "Manage Admins" tab');
      console.log('4. Use that tab to create admin2\n');
    } else {
      console.log('⚠️ No admins found in database!');
      console.log('Please create an admin first via signup page.\n');
    }

    await mongoose.connection.close();
    console.log('Database connection closed.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

makeSuperAdmin();
