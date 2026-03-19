const { NestFactory } = require("@nestjs/core");
const { AppModule } = require("./dist/app.module");
const { getModelToken } = require("@nestjs/mongoose");

async function listAdmins() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const userModel = app.get(getModelToken("User"));
    const admins = await userModel.find({ role: 'admin' }).select('email').lean();
    console.log("Admins found:", admins);
    await app.close();
}

listAdmins().catch(console.error);
