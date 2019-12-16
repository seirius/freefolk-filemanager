import { Module } from "@nestjs/common";
import { FileManagerService } from "./filemanager.service";
import { FileManagerController } from "./filemanager.controller";
import { RedisModule } from "./../redis/redis.module";

@Module({
    imports: [RedisModule],
    providers: [FileManagerService],
    controllers: [FileManagerController]
})
export class FileManagerModule {

}