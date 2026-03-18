import * as mongoose from 'mongoose';
import * as bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';
import { UserSchema } from '../src/modules/auth/schemas/user.schema';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/iskcon-ghaziabad';

// SEO User Credentials
const SEO_USER = {
    email: 'seo@iskcon-ghaziabad.org',
    password: 'SEO@Iskcon2024',
    firstName: 'SEO',
    lastName: 'Manager',
    phone: '0000000000',
    role: 'seo',
    isEmailVerified: true,
};

async function createSeoUser() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB successfully');

        const UserModel = mongoose.model('User', UserSchema);

        // Check if SEO user already exists
        const existingUser = await UserModel.findOne({ email: SEO_USER.email.toLowerCase() });

        if (existingUser) {
            console.log(`\n⚠️  SEO user already exists with email: ${SEO_USER.email}`);
            console.log('User details:');
            console.log(`  - Name: ${existingUser.firstName} ${existingUser.lastName}`);
            console.log(`  - Role: ${existingUser.role}`);
            console.log(`  - Email Verified: ${existingUser.isEmailVerified}`);
            console.log('\nIf you want to reset the password, please delete this user first or update it manually.');
            await mongoose.disconnect();
            return;
        }

        // Hash password
        console.log('Hashing password...');
        const hashedPassword = await bcrypt.hash(SEO_USER.password, 10);

        // Create user document
        const newUser = new UserModel({
            email: SEO_USER.email.toLowerCase(),
            password: hashedPassword,
            firstName: SEO_USER.firstName,
            lastName: SEO_USER.lastName,
            phone: SEO_USER.phone,
            role: SEO_USER.role,
            isEmailVerified: SEO_USER.isEmailVerified,
            loginAttempts: 0,
        });

        // Save user
        console.log('Creating SEO user...');
        await newUser.save();

        console.log('\n✅ SEO user created successfully!');
        console.log('\n📋 Login Credentials:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`  Email:    ${SEO_USER.email}`);
        console.log(`  Password: ${SEO_USER.password}`);
        console.log(`  Role:     ${SEO_USER.role}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`\n  User ID: ${newUser._id}`);
        console.log('\n⚠️  IMPORTANT: Please save these credentials securely!');
        console.log('   You can change the password after first login.\n');

        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Error creating SEO user:', error);
        await mongoose.disconnect();
        process.exit(1);
    }
}

// Run the script
createSeoUser().catch(err => console.error(err));
