import { Controller, Post, Get } from "@overnightjs/core";
import { Catch } from "../error/ErrorDeco";
import { Request, Response } from "express";
import { HttpError } from "../error/HttpError";
import { BAD_REQUEST, OK, INTERNAL_SERVER_ERROR } from "http-status-codes";
import { FileManager } from "./FileManager";
import { UploadedFile } from "express-fileupload";
import { lookup } from "mime-types";

/**
 * @swagger
 * definitions:
 *  Metadata:
 *      type: object
 *      properties:
 *          id:
 *              type: string
 *          path:
 *              type: string
 *          filename:
 *              type: string
 *          tags:
 *              type: array
 *              items:
 *                  type: string
 */
@Controller('')
export class FileManagerController {

    private constructor() {}

    public static async create(): Promise<FileManager> {
        await FileManager.init();
        return new FileManagerController();
    }

    /**
     * @swagger
     * /upload:
     *  post:
     *      tags:
     *          - file
     *      consumes:
     *          - multipart/form-data
     *      parameters:
     *          - in: formData
     *            name: file
     *            type: file
     *            description: File to upload
     *          - in: formData
     *            name: id
     *            type: string
     *          - in: formData
     *            name: tags
     *            type: string
     *      responses:
     *          200:
     *              description: ok
     *              schema:
     *                  type: object
     *                  properties:
     *                      ok:
     *                          type: boolean
     *                          value: true
     */
    @Post('upload')
    @Catch
    public async upload(req: Request, res: Response): Promise<void> {
        if (!req.files || !req.files.file) {
            throw new HttpError('No file was uploaded', BAD_REQUEST);
        }
        let {id, tags} = req.body;
        if (!id) {
            throw new HttpError('No id was sent', BAD_REQUEST);
        }
        if (typeof tags === 'string') {
            tags = tags.split(',');
        }
        await FileManager.write({file: req.files.file as UploadedFile, id, tags});
        res.status(OK).json({ok: true});
    }

    /**
     * @swagger
     * /download/{id}:
     *  get:
     *      tags:
     *          - file
     *      parameters:
     *          - in: path
     *            name: id
     *            required: true
     *            type: string
     *      responses:
     *          200:
     *              description: ok
     *              content:
     *                  video/mp4:
     *                      schema:
     *                          type: string
     *                          format: binary
     *                  audio/mp3:
     *                      schema:
     *                          type: string
     *                          format: binary
     */
    @Get('download/:id')
    @Catch
    public async download(req: Request, res: Response): Promise<void> {
        const {id} = req.params;
        const {readStream, metadata: {filename}} = await FileManager.read({id});
        res.setHeader('Content-disposition', 'attachment; filename=' + filename);
        res.setHeader("x-suggested-filename", filename);
        res.setHeader("content-type", lookup(filename) || "application/octet-stream");
        readStream.pipe(res);
        readStream.on("error", (error) => {
            res.status(INTERNAL_SERVER_ERROR).json({ok: false});
        });
        readStream.on("close", () => res.end());
    }

    /**
     * @swagger
     * /metadata/{id}:
     *  get:
     *      tags:
     *          - metadata
     *      parameters:
     *          - in: path
     *            name: id
     *            type: string
     *            required: true
     *      responses:
     *          200:
     *              description: ok
     *              schema:
     *                  $ref: '#/definitions/Metadata'
     *                      
     */
    @Get("metadata/:id")
    @Catch
    public async metadata(req: Request, res: Response): Promise<void> {
        const {id} = req.params;
        const metadata = await FileManager.getFileMetadata(id);
        res.status(OK).json(metadata);
    }

}