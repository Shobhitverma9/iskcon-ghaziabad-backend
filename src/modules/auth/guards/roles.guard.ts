import { Injectable, CanActivate, ExecutionContext, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { User } from '../schemas/user.schema';

@Injectable()
export class RolesGuard implements CanActivate {
    private readonly logger = new Logger(RolesGuard.name);

    constructor(private reflector: Reflector) { }

    canActivate(context: ExecutionContext): boolean {
        const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (!requiredRoles) {
            return true;
        }

        const { user } = context.switchToHttp().getRequest();

        // If no user attached to request (e.g. public route or auth failed before this), deny
        if (!user) {
            this.logger.warn('Access denied: No user found on request');
            return false;
        }

        this.logger.log(`Checked User Role: ${user.role}, Required: ${requiredRoles.join(',')}`);
        const hasRole = requiredRoles.some((role) => user.role === role);
        if (!hasRole) this.logger.warn('Access denied: Insufficient permissions');
        return hasRole;
    }
}
