import { NestFactory } from "@nestjs/core"
import { AppModule } from "./app.module"
import { SongsService } from "./modules/songs/songs.service"
import { InjectModel } from "@nestjs/mongoose"
import { Model } from "mongoose"
import { Song, SongDocument } from "./modules/songs/schemas/song.schema"

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule)
    // We need to access the model directly or add a removeAll method to service.
    // Easier to just use the service to find all and delete, or add a method.
    // Hack: use the model if we can, but simpler to just add a method to service? 
    // Or just use the connection.

    const songsService = app.get(SongsService);
    await songsService.deleteAll();
    console.log("Deleted all songs.");

    await app.close()
}
bootstrap()
