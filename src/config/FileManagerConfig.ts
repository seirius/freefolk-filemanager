import * as env from "env-var";
import { config as envConfig } from "dotenv";
envConfig();

export class FileManagerConfig {

    public static readonly FILE_DIRECTORY = env.get("FILE_DIRECTORY", "/usr/src/app/files").asString();
    public static readonly FILE_DIRECTORY_TMP = env.get("FILE_DIRECTORY_TMP", "/usr/src/app/files/tmp").asString();
    public static readonly EXPIRATION_TIME = env.get("FILE_EXPIRATION_TIME", `${1 * 60 * 60}`).asIntPositive();

}