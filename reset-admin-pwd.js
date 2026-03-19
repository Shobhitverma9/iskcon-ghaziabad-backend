const { NestFactory } = require("@nestjs/core");
const { AppModule } = require("./dist/app.module");
const { getModelToken } = require("@nestjs/mongoose");
const bcrypt = require('bcryptjs');

async function resetPassword() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const userModel = app.get(getModelToken("User"));
    const hashedPassword = await bcrypt.hash("Admin@123", 10);
    await userModel.updateOne({ email: 'admin2@iskcon.org' }, { $set: { password: hashedPassword } });
    console.log("Password reset for admin2@iskcon.org to Admin@123");
    await app.close();
}

resetPassword().catch(console.error);
