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

        const admin2Email = "admin2@iskcon.com"
        const admin2Password = "Admin2@1234"

        console.log(`Checking for existing user: ${admin2Email}`)
        const existingUser2 = await userModel.findOne({ email: admin2Email })

        if (existingUser2) {
            console.log("Admin user 2 already exists. Updating role to admin...")
            existingUser2.role = 'admin'
            await existingUser2.save()
            console.log("Admin user 2 updated.")
        } else {
            console.log("Creating new admin user 2...")
            const hashedPassword2 = await bcrypt.hash(admin2Password, 10)

            const newUser2 = new userModel({
                email: admin2Email,
                password: hashedPassword2,
                firstName: "Secondary",
                lastName: "Admin",
                phone: "0000000001",
                role: "admin",
                isEmailVerified: true,
                loginAttempts: 0
            })

            await newUser2.save()
            console.log("Admin user 2 created successfully.")
        }

        console.log("------------------------------------------")
        console.log("Login Credentials:")
        console.log(`Email:    ${adminEmail}`)
        console.log(`Password: ${adminPassword}`)
        console.log("------------------------------------------")
        console.log("Login Credentials (Secondary Admin):")
        console.log(`Email:    ${admin2Email}`)
        console.log(`Password: ${admin2Password}`)
        console.log("------------------------------------------")

    } catch (error) {
        console.error("Seeding Failed:", error)
    } finally {
        await app.close()
    }
}

bootstrap()
