import { Injectable, Logger } from "@nestjs/common";
import { RedisClient, createClient } from "redis";
import { RedisConfig } from "./../config/RedisConfig";

export enum RedisEvent {
    EXPIRE = "expired",
    DELETE = "del"
}

@Injectable()
export class RedisService {

    private readonly logger = new Logger(RedisService.name);

    public redisClient: RedisClient;

    constructor() {
        this.redisClient = createClient({
            host: RedisConfig.HOST,
            port: RedisConfig.PORT,
            db: RedisConfig.FILE_DB
        });
    }

    public subEvents(args: ISubEventArgs[]): void {
        const parsedSubs = args.map(({event, callback}) => {
            return {
                event: `__keyevent@${RedisConfig.FILE_DB}__:${event}`,
                callback
            };
        });
        this.redisClient.sendCommand("config", ["set", "notify-keyspace-events", "KEA"], async () => {
            const subClient = createClient({
                host: RedisConfig.HOST,
                port: RedisConfig.PORT,
                db: RedisConfig.FILE_DB
            });
            subClient.subscribe(parsedSubs.map((arg) => arg.event));
            subClient.on("message", async (channel, key) => {
                try {
                    parsedSubs.forEach(({event, callback}) => {
                        if (event === channel) {
                            callback(channel, key);
                        }
                    });
                } catch (error) {
                    this.logger.error(error);
                }
            });
        });
    }

}

export interface ISubEventArgs {
    event: RedisEvent;
    callback: (channel: string, key: string) => void;
}