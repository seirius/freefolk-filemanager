import { Controller, Post, HttpCode, HttpStatus, Body, UploadedFile, UseInterceptors, HttpException, Get, Param, Response as nResponse, Query } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { UploadDto, UploadResponseDto, MetadataDto } from "./filemanager.dto";
import { FileManagerService } from "./filemanager.service";
import { ApiResponse, ApiConsumes, ApiOkResponse } from "@nestjs/swagger";
import { lookup } from "mime-types";
import { Response } from "express";
import { ParseBooleanPipe } from "./../util/parse-boolean.boolean";

@Controller()
export class FileManagerController {

    constructor(
        private readonly filemanagerService: FileManagerService
    ) {}

    @Post("upload")
    @HttpCode(HttpStatus.OK)
    @ApiResponse({
        status: HttpStatus.OK,
        description: "File upload",
        type: UploadResponseDto
    })
    @ApiConsumes("multipart/form-data")
    @UseInterceptors(FileInterceptor("file"))
    public async upload(
        @Body() uploadDto: UploadDto,
        @UploadedFile() file: any
    ): Promise<UploadResponseDto> {
        const {id, tags} = uploadDto;
        if (!file) {
            throw new HttpException("No file was uploaded", HttpStatus.BAD_REQUEST);
        }
        let formattedTags = [];
        if (!id) {
            throw new HttpException("No id was sent", HttpStatus.BAD_REQUEST);
        }
        if (typeof tags === "string") {
            formattedTags = tags.split(',');
        }
        await this.filemanagerService.write({file, id, tags: formattedTags});
        return {ok: true};
    }

    @Get("download/:id")
    @ApiResponse({
        status: HttpStatus.OK,
        description: "File download",
        content: {
            "video/mp4": {
                schema: {
                    type: "string",
                    format: "binary"
                }
            },
            "audio/mp3": {
                schema: {
                    type: "string",
                    format: "binary"
                }
            }
        }
    })
    public async download(
        @Param("id") id: string,
        @Query("erase", ParseBooleanPipe) erase: boolean,
        @nResponse() response: Response
    ): Promise<void> {
        const {readStream, metadata: {filename}} = await this.filemanagerService.read({id, erase});
        response.setHeader('Content-disposition', 'attachment; filename=' + filename);
        response.setHeader("x-suggested-filename", filename);
        response.setHeader("content-type", lookup(filename) || "application/octet-stream");
        readStream.pipe(response);
        readStream.on("error", (error) => {
            response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ok: false});
        });
        readStream.on("close", () => response.end());
    }

    @Get("metadata/:id")
    @ApiOkResponse({type: MetadataDto})
    public metadata(@Param("id") id: string): Promise<MetadataDto> {
        return this.filemanagerService.getFileMetadata(id);
    }

}