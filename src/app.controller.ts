import { Controller, Get } from "@nestjs/common"

@Controller()
export class AppController {
    @Get()
    getHello(): string {
        return "ISKCON Ghaziabad API is running!"
    }
}
