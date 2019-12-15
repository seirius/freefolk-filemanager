import { Module } from '@nestjs/common';
import { DefaultModule } from './default/default.module';
import { FileManagerModule } from './filemanager/filemanager.module';

@Module({
    imports: [DefaultModule, FileManagerModule],
    controllers: [],
    providers: [],
})
export class AppModule { }
