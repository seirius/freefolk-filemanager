import { Module } from "@nestjs/common";
import { ParseBooleanPipe } from "./parse-boolean.boolean";

@Module({
    providers: [ParseBooleanPipe],
    exports: [ParseBooleanPipe]
})
export class UtilModule {}