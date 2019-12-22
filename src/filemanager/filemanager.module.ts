import { Module } from "@nestjs/common";
import { FileManagerService } from "./filemanager.service";
import { FileManagerController } from "./filemanager.controller";
import { RedisModule } from "./../redis/redis.module";
import { UtilModule } from "./../util/util.module";

@Module({
    imports: [RedisModule, UtilModule],
    providers: [FileManagerService],
    controllers: [FileManagerController]
})
export class FileManagerModule {

}