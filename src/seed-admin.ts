// @ts-nocheck
import { NestFactory } from "@nestjs/core"
import { AppModule } from "./app.module"
import { AuthService } from "./modules/auth/auth.service"
import { User } from "./modules/auth/schemas/user.schema"
import { getModelToken } from "@nestjs/mongoose"
import * as bcrypt from 'bcryptjs'

async function bootstrap() {
    console.log("Initializing Admin Seeding...");
    const app = await NestFactory.createApplicationContext(AppModule)

    try {
        const authService = app.get(AuthService)
        const userModel = app.get(getModelToken(User.name))

        const adminEmail = "admin@iskcon.com"
        const adminPassword = "Admin@123"

        console.log(`Checking for existing user: ${adminEmail}`)
        const existingUser = await userModel.findOne({ email: adminEmail })

        if (existingUser) {
            console.log("Admin user already exists. Updating role to admin...")
            existingUser.role = 'admin'
            // Optional: Reset password if you want strict control
            // existingUser.password = await bcrypt.hash(adminPassword, 10)
            await existingUser.save()
            console.log("Admin user updated.")
        } else {
            console.log("Creating new admin user...")
            // We can't easily use authService.signup because it hardcodes role='user'
            // So we use the model directly

            const hashedPassword = await bcrypt.hash(adminPassword, 10)

            const newUser = new userModel({
                email: adminEmail,
                password: hashedPassword,
                firstName: "System",
                lastName: "Admin",
                phone: "0000000000",
                role: "admin",
                isEmailVerified: true,
                loginAttempts: 0
            })

            await newUser.save()
            console.log("Admin user created successfully.")
        }

        console.log("------------------------------------------")
        console.log("Login Credentials:")
        console.log(`Email:    ${adminEmail}`)
        console.log(`Password: ${adminPassword}`)
        console.log("------------------------------------------")

    } catch (error) {
        console.error("Seeding Failed:", error)
    } finally {
        await app.close()
    }
}

bootstrap()
