import { ApiProperty } from "@nestjs/swagger";

export class UploadDto {
    @ApiProperty()
    id: string;

    @ApiProperty()
    tags: string;

    @ApiProperty({
        type: "string",
        format: "binary"
    })
    file: any;
}

export class UploadResponseDto {
    @ApiProperty()
    ok: boolean;
}

export class MetadataDto {
    @ApiProperty()
    id: string;

    @ApiProperty()
    path: string;

    @ApiProperty()
    filename: string;

    @ApiProperty()
    tags: string[];

    @ApiProperty()
    stored: boolean;
}