import { Injectable, HttpException, HttpStatus, Logger } from "@nestjs/common";
import { join } from "path";
import { FileManagerConfig } from "./../config/FileManagerConfig";
import { ReadStream, createReadStream, promises } from "fs";
import { RedisService, RedisEvent } from "./../redis/redis.service";

@Injectable()
export class FileManagerService {

    private readonly logger = new Logger(FileManagerService.name);

    constructor(
        private readonly redisService: RedisService
    ) {
        this.redisService.subEvents([
            {
                event: RedisEvent.DELETE,
                callback: async (channel: string, key: string) => {
                    if (key.includes(":exp")) {
                        const [id] = key.split(":");
                        const fileData = await this.getFileMetadata(id);
                        if (fileData) {
                            await this.deleteAll(id, fileData.path);
                        }
                    }
                }
            },
            {
                event: RedisEvent.EXPIRE,
                callback: async (channel: string, key: string) => {
                    if (key.includes(":exp")) {
                        const [id] = key.split(":");
                        const fileData = await this.getFileMetadata(id);
                        if (fileData) {
                            await this.deleteFile(fileData.path);
                            this.redisService.redisClient.del(id, (error: Error) => {
                                if (error) {
                                    this.logger.error(error);
                                }
                            });
                        }
                    }
                }
            }
        ]);
    }

    public async write({file, id, tags}: IWriteArgs): Promise<void> {
        const path = join(FileManagerConfig.FILE_DIRECTORY, file.originalname);
        try {
            await this.saveFileMetadata({id, path, tags, filename: file.originalname, stored: false});
            await promises.writeFile(path, file.buffer);
            await this.updateMetadata(id, {stored: true});
        } catch (error) {
            await this.deleteAll(id, path);
            throw error;
        }
    }

    public async read({id, erase}: IReadArgs): Promise<IReadResponse> {
        if (erase === undefined) {
            erase = true;
        }
        const metadata = await this.getFileMetadata(id);
        if (!metadata) {
            return null;
        }
        const readStream = createReadStream(metadata.path);

        if (erase) {
            readStream.on("close", async () => {
                try {
                    await this.expireFile(id);
                } catch (deleteError) {
                    this.logger.error(deleteError);
                }
            });
        }
        return {readStream, metadata};
    }

    public async deleteFile(path: string): Promise<void> {
        await promises.unlink(path);
    }

    public saveFileMetadata({id, path, tags, filename, stored}: IFileMetadata): Promise<void> {
        return new Promise((resolve, reject) => {
            this.redisService.redisClient.set(id, JSON.stringify({id, path, tags, filename, stored}), (error) => {
                if (error) {
                    reject(error);
                } else {
                    this.redisService.redisClient.set(`${id}:exp`, "1", "EX", FileManagerConfig.EXPIRATION_TIME, (err) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve();
                        }
                    });
                }
            })
        })
    }

    public getFileMetadata(id: string): Promise<IFileMetadata> {
        return new Promise((resolve, reject) => {
            this.redisService.redisClient.get(id, (error, data) => {
                if (error) {
                    reject(error);
                } else if (typeof data === "string") {
                    resolve(JSON.parse(data));
                } else {
                    resolve(undefined);
                }
            });
        });
    }

    public async updateMetadata(id: string, args: Record<string, any>): Promise<void> {
        let metadata = await this.getFileMetadata(id);
        if (!metadata) {
            throw new HttpException("No metadata found", HttpStatus.BAD_REQUEST);
        }

        metadata = {...metadata, ...args, ...{id}};
        await this.saveFileMetadata(metadata);
    }

    public deleteFileMetadata(id: string): Promise<void> {
        return new Promise((resolve, reject) => {
            this.redisService.redisClient.del(id, (error) => {
                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            });
        });
    }

    public expireFile(id: string): Promise<void> {
        return new Promise((resolve, reject) => {
            this.redisService.redisClient.expireat(`${id}:exp`, 1, (error) => {
                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            });
        });
    }

    public async deleteAll(id: string, path?: string): Promise<void> {
        if (!path) {
            const metadata = await this.getFileMetadata(id);
            if (!metadata) {
                throw new Error(`No metadata for ${id}`);
            }
            path = metadata.path;
        }
        await this.deleteFile(path);
        await this.deleteFileMetadata(id);
    }

}

export interface IWriteArgs {
    id: string;
    file: any;
    tags: string[];
}

export interface IReadArgs {
    id: string;
    erase?: boolean;
}

export interface IReadResponse {
    readStream: ReadStream;
    metadata: IFileMetadata;
}

export interface IFileMetadata {
    id: string;
    path: string;
    filename: string;
    tags: string[];
    stored: boolean;
}