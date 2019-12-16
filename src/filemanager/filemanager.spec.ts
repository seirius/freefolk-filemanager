import { Test, TestingModule } from "@nestjs/testing";
import { FileManagerController } from "./filemanager.controller";
import { FileManagerService } from "./filemanager.service";
import { RedisService } from "./../redis/redis.service";
import { RedisModule } from "./../redis/redis.module";
import { existsSync, promises } from "fs";
import { join } from "path";
import { PassThrough } from "stream";
import { FileManagerConfig } from "./../config/FileManagerConfig";

describe("FileManagerController", () => {
    let app: TestingModule;

    const testFileName = "test.name.txt";
    const testFilePath = join(FileManagerConfig.FILE_DIRECTORY, testFileName);

    beforeAll(async () => {

        const executeRedisFun = (...args: any[]) => {
            args.forEach((arg) => {
                if (typeof arg === "function") {
                    arg();
                }
            });
        };
        const redisServiceMock = {
            redisClient: {
                set: executeRedisFun,
                get: (...args: any[]) => {
                    args.forEach((arg) => {
                        if (typeof arg === "function") {
                            arg(undefined, JSON.stringify({
                                id: "test",
                                path: testFilePath,
                                filename: testFileName,
                                stored: true
                            }));
                        }
                    });
                },
                del: executeRedisFun,
                expireat: executeRedisFun
            },
            subEvents: () => {}
        };
        app = await Test.createTestingModule({
            imports: [RedisModule],
            providers: [FileManagerService],
            controllers: [FileManagerController]
        })
        .overrideProvider(RedisService)
        .useValue(redisServiceMock)
        .compile();
    });

    describe("upload", () => {
        it("should save a file", async () => {
            const fileManagerController = app.get<FileManagerController>(FileManagerController);
            const file = {
                originalname: testFileName,
                buffer: Buffer.from("test text", "utf-8")
            };
            const result = await fileManagerController.upload({
                id: "test",
                file,
                tags: "test"
            }, file);
            expect(result).toBeInstanceOf(Object);
            expect(result.ok).toEqual(true);
            expect(existsSync(testFilePath)).toEqual(true);
        });
    });

    describe("download", () => {
        it("should download a file", async () => {
            const fileManagerController = app.get<FileManagerController>(FileManagerController);
            const response: any = new PassThrough();
            response.end  = () => {};
            response.setHeader = () => {};
            response.status = () => {};
            const result = await fileManagerController.download("test", response);
            expect(result).toEqual(undefined);
        });
    });

    describe("metadata", () => {
        it("should return the metadata", async () => {
            const fileManagerController = app.get<FileManagerController>(FileManagerController);
            const result = await fileManagerController.metadata("test");
            expect(result).toBeInstanceOf(Object);
        });
    });

    afterAll(async () => {
        promises.unlink(testFilePath);
    });
});