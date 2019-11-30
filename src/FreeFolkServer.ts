import { Server } from '@overnightjs/core';
import { json, urlencoded } from 'body-parser';
import { ServerConfig } from './config/ServerConfig';
import { Logger } from '@overnightjs/logger';
import { DefaultController } from './default/Default.controller';
import swagger from 'swagger-jsdoc';
import * as swaggerUi from 'swagger-ui-express';
import fileUpload from 'express-fileupload';
import { FileManagerConfig } from './config/FileManagerConfig';
import { FileManagerController } from './filemanager/FileManager.controller';
import express from "express";

export class FreeFolkServer extends Server {

    constructor() {
        super(true);
    }

    public async start(): Promise<void> {
        const specs = swagger({
            apis: ['**/*.controller.*'],
            swaggerDefinition: {
                info: {
                    description: 'FileManager API',
                    title: 'FileManager',
                    version: '1.0.0',
                },
            },
        });
        this.app.use(json());
        this.app.use(urlencoded({extended: true}));
        this.app.use(fileUpload({
            useTempFiles: true,
            tempFileDir: FileManagerConfig.FILE_DIRECTORY_TMP
        }));
        this.addControllers([
            new DefaultController(),
            await FileManagerController.create(),
        ]);
        this.app.use(
            '/swagger',
            swaggerUi.serve,
            swaggerUi.setup(specs)
        );
        this.app.listen(
            ServerConfig.PORT, 
            () => {
                Logger.Info(`Server listenning at http://localhost:${ServerConfig.PORT}`, true);
                Logger.Info(`Swagger at http://localhost:${ServerConfig.PORT}/swagger`, true);
            }
        );
    }

}