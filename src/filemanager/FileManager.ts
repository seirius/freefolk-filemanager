import { UploadedFile } from "express-fileupload";
import { FileManagerConfig } from "../config/FileManagerConfig";
import { join } from "path";
import { promises, ReadStream, createReadStream } from "fs";
import { createClient, RedisClient } from "redis";
import { RedisConfig } from "../config/RedisConfig";
import { Logger } from "@overnightjs/logger";

export class FileManager {

    public static REDIS_CLIENT: RedisClient;

    public static async write({file, id, tags}: IWriteArgs): Promise<void> {
        const path = join(FileManagerConfig.FILE_DIRECTORY, file.name);
        try {
            await FileManager.saveFileMetadata({id, path, tags, filename: file.name});
            await file.mv(path);
        } catch (error) {
            await FileManager.deleteAll(id, path);
            throw error;
        }
    }

    public static async read({id, erase}: IReadArgs): Promise<IReadResponse> {
        if (erase === undefined) {
            erase = true;
        }
        const metadata = await FileManager.getFileMetadata(id);
        if (!metadata) {
            return null;
        }
        const readStream = createReadStream(metadata.path, {
            emitClose: true
        });

        if (erase) {
            readStream.on("close", async () => {
                try {
                    await FileManager.deleteFileMetadata(id);
                } catch (deleteError) {
                    Logger.Err(deleteError, true);
                }
            });
        }
        return {readStream, metadata};
    }

    public static async deleteFile(path: string): Promise<void> {
        await promises.unlink(path);
    }

    public static saveFileMetadata({id, path, tags, filename}: IFileMetadata): Promise<void> {
        return new Promise((resolve, reject) => {
            const { REDIS_CLIENT } = FileManager;
            REDIS_CLIENT.set(id, JSON.stringify({id, path, tags, filename}), (error) => {
                if (error) {
                    reject(error);
                } else {
                    REDIS_CLIENT.set(`${id}:exp`, "1", "EX", FileManagerConfig.EXPIRATION_TIME, (err) => {
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

    public static getFileMetadata(id: string): Promise<IFileMetadata> {
        return new Promise((resolve, reject) => {
            FileManager.REDIS_CLIENT.get(id, (error, data) => {
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

    public static deleteFileMetadata(id: string): Promise<void> {
        return new Promise((resolve, reject) => {
            FileManager.REDIS_CLIENT.del(`${id}:exp`, (error) => {
                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            });
        });
    }

    public static async deleteAll(id: string, path?: string): Promise<void> {
        if (!path) {
            const metadata = await FileManager.getFileMetadata(id);
            if (!metadata) {
                throw new Error(`No metadata for ${id}`);
            }
            path = metadata.path;
        }
        await FileManager.deleteFile(path);
        await FileManager.deleteFileMetadata(id);
    }

    public static init(): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                FileManager.REDIS_CLIENT = createClient({
                    host: RedisConfig.HOST,
                    port: RedisConfig.PORT,
                    db: RedisConfig.FILE_DB,
                });
                FileManager.REDIS_CLIENT.sendCommand("config", ["set", "notify-keyspace-events", "KEA"], async () => {
                    const EXPIRE_EVENT = `__keyevent@${RedisConfig.FILE_DB}__:expired`;
                    const DELETE_EVENT = `__keyevent@${RedisConfig.FILE_DB}__:del`;
                    const subClient = createClient({
                        host: RedisConfig.HOST,
                        port: RedisConfig.PORT,
                        db: RedisConfig.FILE_DB,
                    });
                    subClient.subscribe([EXPIRE_EVENT, DELETE_EVENT]);
                    subClient.on("message", async (channel, key) => {
                        try {
                            if (key.includes(":exp")) {
                                const [id] = key.split(":");
                                const fileData = await FileManager.getFileMetadata(id);
                                if (fileData) {
                                    if (channel === EXPIRE_EVENT) {
                                        await FileManager.deleteAll(id, fileData.path);
                                    } else if (channel === DELETE_EVENT) {
                                        await FileManager.deleteFile(fileData.path);
                                        FileManager.REDIS_CLIENT.del(id, (error) => {
                                            if (error) {
                                                Logger.Err(error, true);
                                            }
                                        });
                                    }
                                }
                            }
                        } catch (error) {
                            Logger.Err(error, true);
                        }
                    });
                    resolve();
                });
            } catch (err) {
                Logger.Err(err, true);
                reject(err);
            }
        });
    }
}

export interface IWriteArgs {
    id: string;
    file: UploadedFile;
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
}