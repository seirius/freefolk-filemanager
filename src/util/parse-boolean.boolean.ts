import { PipeTransform, ArgumentMetadata, Injectable } from "@nestjs/common";

@Injectable()
export class ParseBooleanPipe implements PipeTransform {
    transform(value: any, metadata: ArgumentMetadata): boolean {
        if (value === "true") {
            return true;
        } else if (value === "false") {
            return false;
        }

        return undefined;
    }
}