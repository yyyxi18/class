import { Schema, model, connect, Mongoose } from 'mongoose';
import { logger } from '../middlewares/log';
import { MongoInfo } from '../interfaces/MongoInfo';
export class MongoDB {
    
    DB: Mongoose | void | undefined
    isConneted : boolean = false;

    constructor(info: MongoInfo) {

        // 根據是否有認證資訊決定連接方式
        const hasAuth = info.name && info.password;
        
        if (hasAuth) {
            const authUrl = `mongodb://${info.name}:${encodeURIComponent(info.password)}@${info.host}:${info.port}/${info.dbName}`;
            this.init(authUrl).then(() => {
                logger.info(`suscess: connet to mongoDB @${authUrl}`);
                this.isConneted = true;
            }).catch(() => {
                // 如果認證失敗，嘗試無認證連接
                const noAuthUrl = `mongodb://${info.host}:${info.port}/${info.dbName}`;
                this.init(noAuthUrl).then(() => {
                    logger.info(`suscess: connet to mongoDB @${noAuthUrl} (no auth)`);
                    this.isConneted = true;
                }).catch((err) => {
                    logger.error(`error: cannt connet to mongoDB ${err}`);
                });
            });
        } else {
            // 直接嘗試無認證連接
            const noAuthUrl = `mongodb://${info.host}:${info.port}/${info.dbName}`;
            this.init(noAuthUrl).then(() => {
                logger.info(`suscess: connet to mongoDB @${noAuthUrl} (no auth)`);
                this.isConneted = true;
            }).catch((err) => {
                logger.error(`error: cannt connet to mongoDB ${err}`);
            });
        }

    }

    async init(url: string) {
        try {
            this.DB = await connect(url);
            return this.DB;
        } catch(err) {
            logger.error(`error: cannt connet to mongoDB ${err}`);
            throw err;
        }
    }

    getState():boolean{
        return this.isConneted;
    }
}

