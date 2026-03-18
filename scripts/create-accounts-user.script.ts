import * as mongoose from 'mongoose';
import * as bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';
import { UserSchema } from '../src/modules/auth/schemas/user.schema';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/iskcon-ghaziabad';

// Accounts User Credentials
const ACCOUNTS_USER = {
    email: 'accounts@iskcon-ghaziabad.org',
    password: process.argv[2] || 'Accounts@Iskcon2024', // Allow passing password as arg
    firstName: 'Accounts',
    lastName: 'Manager',
    phone: '0000000002',
    role: 'accounts',
    isEmailVerified: true,
};

async function createAccountsUser() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB successfully');

        const UserModel = mongoose.model('User', UserSchema);

        // Check if user already exists
        const existingUser = await UserModel.findOne({ email: ACCOUNTS_USER.email.toLowerCase() });

        if (existingUser) {
            console.log(`\n⚠️  User already exists with email: ${ACCOUNTS_USER.email}`);
            console.log('User details:');
            console.log(`  - Name: ${existingUser.firstName} ${existingUser.lastName}`);
            console.log(`  - Role: ${existingUser.role}`);

            // If exists but role is not accounts, update it
            if (existingUser.role !== 'accounts') {
                console.log('  - Current role is NOT "accounts". Updating role...');
                existingUser.role = 'accounts';
                await existingUser.save();
                console.log('  ✅ Role updated to "accounts"');
            } else {
                console.log('  - Role is already "accounts"');
            }

            await mongoose.disconnect();
            return;
        }

        // Hash password
        console.log('Hashing password...');
        const hashedPassword = await bcrypt.hash(ACCOUNTS_USER.password, 10);

        // Create user document
        const newUser = new UserModel({
            email: ACCOUNTS_USER.email.toLowerCase(),
            password: hashedPassword,
            firstName: ACCOUNTS_USER.firstName,
            lastName: ACCOUNTS_USER.lastName,
            phone: ACCOUNTS_USER.phone,
            role: ACCOUNTS_USER.role,
            isEmailVerified: ACCOUNTS_USER.isEmailVerified,
            loginAttempts: 0,
        });

        // Save user
        console.log('Creating Accounts user...');
        await newUser.save();

        console.log('\n✅ Accounts user created successfully!');
        console.log('\n📋 Login Credentials:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`  Email:    ${ACCOUNTS_USER.email}`);
        console.log(`  Password: ${ACCOUNTS_USER.password}`);
        console.log(`  Role:     ${ACCOUNTS_USER.role}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`\n  User ID: ${newUser._id}`);
        console.log('\n⚠️  IMPORTANT: Please save these credentials securely!');

        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Error creating Accounts user:', error);
        await mongoose.disconnect();
        process.exit(1);
    }
}

// Run the script
createAccountsUser().catch(err => console.error(err));
