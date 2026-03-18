import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { AuthService } from '../auth.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    private readonly logger = new Logger(JwtStrategy.name);

    constructor(
        private authService: AuthService,
        private configService: ConfigService
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromExtractors([
                // Extract from cookie first
                (request: Request) => {
                    if (request && request.cookies) {
                        this.logger.log(`Cookies received: ${Object.keys(request.cookies).join(', ')}`);
                        this.logger.log(`session_token present: ${!!request.cookies.session_token}`);
                    } else {
                        this.logger.log(`No cookies received on request to: ${request.url}`);
                    }
                    return request?.cookies?.session_token;
                },
                // Fallback to Authorization header
                ExtractJwt.fromAuthHeaderAsBearerToken(),
            ]),
            ignoreExpiration: false,
            passReqToCallback: true,
            secretOrKey: configService.get<string>('JWT_SECRET') || 'your-secret-key-change-in-production',
        });
    }

    async validate(req: Request, payload: any) {
        this.logger.log(`Validating payload: ${JSON.stringify(payload)}`);

        // Extract token from cookie or header
        const token = req?.cookies?.session_token || ExtractJwt.fromAuthHeaderAsBearerToken()(req);

        if (!token) {
            this.logger.warn('Validation failed: No token found');
            return null;
        }

        // Validate session is active
        const isSessionValid = await this.authService.validateSession(token);
        if (!isSessionValid) {
            this.logger.warn('Validation failed: Session is invalid or expired');
            return null;
        }

        const user = await this.authService.validateUser(payload.sub);
        if (!user) {
            this.logger.warn(`Validation failed: User not found for ID: ${payload.sub}`);
            return null;
        }
        this.logger.log(`Validation success. User role: ${payload.role}`);
        return { userId: payload.sub, email: payload.email, role: payload.role };
    }
}
