import { Controller, Post, Body, Res, Req, Get, HttpCode, HttpStatus, UseGuards, Patch, Logger } from '@nestjs/common';
import { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
    private readonly logger = new Logger(AuthController.name);

    constructor(private readonly authService: AuthService) { }

    @Get('debug')
    async debug() {
        return this.authService.getDebugDbInfo();
    }
    @Post('signup')
    @HttpCode(HttpStatus.CREATED)
    async signup(@Body() signupDto: SignupDto) {
        this.logger.log(`Signup request received: ${signupDto.email}`);
        const result = await this.authService.signup(signupDto);
        this.logger.log('User created (pending verification)');
        return result;
    }

    @Post('verify-otp')
    @HttpCode(HttpStatus.OK)
    async verifyOtp(
        @Body() body: { email: string; otp: string },
        @Req() req: Request,
        @Res({ passthrough: true }) res: Response,
    ) {
        const ipAddress = req.ip || req.socket.remoteAddress;
        const userAgent = req.get('user-agent');
        const result = await this.authService.verifyOtp(body.email, body.otp, ipAddress, userAgent);

        // Set cookie
        this.setSessionCookie(res, result.token);

        return result;
    }

    @Post('resend-otp')
    @HttpCode(HttpStatus.OK)
    async resendOtp(@Body() body: { email: string }) {
        return this.authService.resendOtp(body.email);
    }

    @Post('google-login')
    @HttpCode(HttpStatus.OK)
    async googleLogin(
        @Body() body: { token: string },
        @Req() req: Request,
        @Res({ passthrough: true }) res: Response,
    ) {
        const ipAddress = req.ip || req.socket.remoteAddress;
        const userAgent = req.get('user-agent');
        const result = await this.authService.googleLogin(body.token, ipAddress, userAgent);

        // Set cookie
        this.setSessionCookie(res, result.token);

        return result;
    }

    private setSessionCookie(res: Response, token: string) {
        res.cookie('__session', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });
    }

    @Post('login')
    @HttpCode(HttpStatus.OK)
    async login(
        @Body() loginDto: LoginDto,
        @Req() req: Request,
        @Res({ passthrough: true }) res: Response,
    ) {
        this.logger.log(`Login request received: ${loginDto.email}`);

        const ipAddress = req.ip || req.socket.remoteAddress;
        const userAgent = req.get('user-agent');

        const result = await this.authService.login(loginDto, ipAddress, userAgent);

        // Set session token as HTTP-only cookie
        this.setSessionCookie(res, result.token);

        this.logger.log('Login successful');
        return result;
    }

    @Post('logout')
    @HttpCode(HttpStatus.OK)
    async logout(
        @Req() req: Request,
        @Res({ passthrough: true }) res: Response,
    ) {
        const token = req.cookies?.__session;

        this.logger.log('Logout request received');
        const result = await this.authService.logout(token);

        // Clear session token cookie
        res.clearCookie('__session');

        this.logger.log('Logout successful');
        return result;
    }

    @UseGuards(JwtAuthGuard)
    @Patch('profile')
    async updateProfile(@Req() req, @Body() updateProfileDto: UpdateProfileDto) {
        return this.authService.updateProfile(req.user.userId, updateProfileDto);
    }

    @UseGuards(JwtAuthGuard)
    @Get('me')
    async getProfile(@Req() req) {
        return req.user;
    }
}
