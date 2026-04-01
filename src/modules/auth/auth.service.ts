import { Injectable, ConflictException, UnauthorizedException, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import { User, UserDocument } from './schemas/user.schema';
import { Session, SessionDocument } from './schemas/session.schema';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { OtpService } from './otp.service';

import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);
    private googleClient: OAuth2Client;

    constructor(
        @InjectModel(User.name) private userModel: Model<UserDocument>,
        @InjectModel(Session.name) private sessionModel: Model<SessionDocument>,
        private jwtService: JwtService,
        private otpService: OtpService,
        @InjectConnection() private connection: Connection
    ) {
        this.googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    }

    async signup(signupDto: SignupDto & { pan?: string }) {
        const { email, password, firstName, lastName, phone, pan } = signupDto;

        // Check if user already exists
        const existingUser = await this.userModel.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            // IF user exists but NOT verified, maybe resend OTP?
            // For now, strict conflict.
            if (!existingUser.isEmailVerified) {
                // Option: Resend OTP here if you want to support re-signup of unverified users
                // But for now, let's just throw conflict or telling them to login
            }
            throw new ConflictException('Email already registered');
        }

        // Hash password
        const hashedPassword = await this.hashPassword(password);

        // Generate OTP
        const otp = this.otpService.generateOtp();
        const otpExpiresAt = new Date();
        otpExpiresAt.setMinutes(otpExpiresAt.getMinutes() + 10); // 10 mins expiry

        // Create user
        const user = new this.userModel({
            email: email.toLowerCase(),
            password: hashedPassword,
            firstName,
            lastName,
            phone,
            pan, // Save PAN
            dob: signupDto.dob, // Save DOB
            role: 'user',
            isEmailVerified: false,
            loginAttempts: 0,
            otp,
            otpExpiresAt
        });

        await user.save();

        // Send OTP
        await this.otpService.sendOtp(email, phone, otp);

        this.logger.log(`Signup: OTP ${otp} sent to ${email}`);

        return {
            message: 'User created. Please verify OTP sent to email/phone.',
            userId: user._id,
            requiresOtp: true,
            email: email,
            phone: phone
        };
    }

    async verifyOtp(email: string, otp: string, ipAddress?: string, userAgent?: string) {
        const user = await this.userModel.findOne({ email: email.toLowerCase() });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        if (user.isEmailVerified && !user.otp) {
            // Already verified, just login?
            // Proceed to login logic if password not required here (OTP login flow)
            // But valid flow is Signup -> Verify.
        }

        if (user.otp !== otp) {
            throw new BadRequestException('Invalid OTP');
        }

        if (user.otpExpiresAt && user.otpExpiresAt < new Date()) {
            throw new BadRequestException('OTP expired');
        }

        // Verify User
        user.isEmailVerified = true;
        user.otp = undefined; // Clear OTP
        user.otpExpiresAt = undefined;
        await user.save();

        // Generate Token & Session (Auto Login)
        return this.generateSession(user, ipAddress, userAgent);
    }

    async resendOtp(email: string) {
        const user = await this.userModel.findOne({ email: email.toLowerCase() });
        if (!user) throw new NotFoundException('User not found');

        const otp = this.otpService.generateOtp();
        const otpExpiresAt = new Date();
        otpExpiresAt.setMinutes(otpExpiresAt.getMinutes() + 10);

        user.otp = otp;
        user.otpExpiresAt = otpExpiresAt;
        await user.save();

        await this.otpService.sendOtp(user.email, user.phone, otp);

        return { message: 'OTP resent successfully' };
    }

    async googleLogin(token: string, ipAddress?: string, userAgent?: string) {
        try {
            const ticket = await this.googleClient.verifyIdToken({
                idToken: token,
                audience: process.env.GOOGLE_CLIENT_ID,
            });
            const payload = ticket.getPayload();
            if (!payload) throw new UnauthorizedException('Invalid Google Token');

            const { email, given_name, family_name, picture } = payload;

            let user = await this.userModel.findOne({ email: email.toLowerCase() });

            if (!user) {
                // Create new user from Google
                // Password is required in schema, so generate a random one
                const randomPassword = Math.random().toString(36).slice(-10);
                const hashedPassword = await this.hashPassword(randomPassword);

                user = new this.userModel({
                    email: email.toLowerCase(),
                    password: hashedPassword,
                    firstName: given_name || 'User',
                    lastName: family_name || '',
                    role: 'user',
                    isEmailVerified: true, // Google verified
                    loginAttempts: 0,
                    // phone is required by schema? If so, we might need to ask it or set dummy?
                    // Schema: @Prop({ required: true }) phone: string;
                    // We might need to relax phone requirement or set a placeholder.
                    // Let's set a placeholder or ask user later. For now, empty string if allowed or 'Not Provided'
                    phone: '0000000000'
                });
                await user.save();
            }

            return this.generateSession(user, ipAddress, userAgent);

        } catch (error) {
            this.logger.error('Google Login Error:', error);
            throw new UnauthorizedException('Google authentication failed');
        }
    }


    async login(loginDto: LoginDto, ipAddress?: string, userAgent?: string) {
        const { email, password } = loginDto;

        // Debug DB Info
        this.logger.log(`Active DB: ${this.connection.name}`);

        // Find user
        this.logger.log(`Attempting login for email: ${email}`);
        const user = await this.userModel.findOne({ email: email.toLowerCase() });

        if (!user) {
            this.logger.log(`User not found for email: ${email}`);
            throw new UnauthorizedException('Invalid email or password');
        }

        // Verify password
        const isPasswordValid = await this.verifyPassword(password, user.password);

        if (!isPasswordValid) {
            // Increment login attempts
            await this.userModel.updateOne(
                { _id: user._id },
                { $inc: { loginAttempts: 1 }, updatedAt: new Date() }
            );
            throw new UnauthorizedException('Invalid email or password');
        }

        return this.generateSession(user, ipAddress, userAgent);
    }

    private async generateSession(user: UserDocument, ipAddress?: string, userAgent?: string) {
        // Generate JWT token
        const payload = { sub: user._id.toString(), email: user.email, role: user.role };
        const token = this.jwtService.sign(payload);

        // Create session
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

        const session = new this.sessionModel({
            userId: user._id,
            token,
            expiresAt,
            isActive: true,
            ipAddress,
            userAgent,
        });

        await session.save();

        // Update last login
        await this.userModel.updateOne(
            { _id: user._id },
            { lastLogin: new Date(), loginAttempts: 0, updatedAt: new Date() }
        );

        // Remove password from response
        const userObject = user.toObject();
        delete userObject.password;
        delete userObject.otp;

        return {
            message: 'Login successful',
            user: userObject,
            token,
        };
    }

    async logout(token: string) {
        if (!token) {
            this.logger.log('No session token provided for logout. Proceeding as successful.');
            return { message: 'Logout successful' };
        }

        // Deactivate session
        await this.sessionModel.updateOne(
            { token, isActive: true },
            { isActive: false }
        );

        return {
            message: 'Logout successful',
        };
    }

    async validateUser(userId: string): Promise<User | null> {
        if (!Types.ObjectId.isValid(userId)) {
            return null;
        }
        return this.userModel.findById(userId).select('-password').exec();
    }

    async validateSession(token: string): Promise<boolean> {
        const session = await this.sessionModel.findOne({
            token,
            isActive: true,
            expiresAt: { $gt: new Date() },
        });
        return !!session;
    }

    private async hashPassword(password: string): Promise<string> {
        const saltRounds = 10;
        return bcrypt.hash(password, saltRounds);
    }

    async updateProfile(userId: string, updateData: any) {
        const user = await this.userModel.findByIdAndUpdate(userId, updateData, { new: true }).select('-password');
        if (!user) {
            throw new UnauthorizedException('User not found');
        }
        return {
            message: 'Profile updated successfully',
            user: user.toObject(),
        };
    }

    private async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
        return bcrypt.compare(password, hashedPassword);
    }

    async getDebugDbInfo() {
        return {
            dbName: this.connection.name,
            host: this.connection.host,
            userCount: await this.userModel.countDocuments(),
            users: await this.userModel.find({}).select('email role').exec()
        };
    }

    async unsubscribe(email: string) {
        if (!email) throw new BadRequestException('Email is required');
        const user = await this.userModel.findOneAndUpdate(
            { email: email.toLowerCase() },
            { isSubscribed: false },
            { new: true }
        );
        this.logger.log(`User ${email} unsubscribed`);
        return { message: 'You have been successfully unsubscribed from our mailing list.' };
    }
}
