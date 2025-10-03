import express from 'express'
import {router} from "./Routers"
import { logger } from './middlewares/log';
const http = require('http');
import cors from 'cors';
import { MongoDB } from './utils/MongoDB';
require('dotenv').config()
const app: express.Application = express()
const server = http.createServer(app);

export const DB = new MongoDB({
  name:process.env.DBUSER || '',
  password:process.env.DBPASSWORD || '',
  host:process.env.DBHOST || '127.0.0.1',
  port:process.env.DBPORT || '27017',
  dbName:process.env.DBNAME || 'class'
});

app.use(cors({
  "origin": [
    "http://localhost:5173", 
    "http://localhost:5174",
    "http://26.64.221.116:5173",
    "http://192.168.0.102:5173",
    "http://100.112.199.48:5173"
  ],
  "methods": "GET,HEAD,PUT,PATCH,POST,DELETE",
  "preflightContinue": false,
  "optionsSuccessStatus": 200,
  "exposedHeaders": ['Content-Disposition'],
  "credentials": true
}))

app.use(express.json({limit:'50mb'}));
app.use(express.urlencoded({ extended: false }))
app.use('/assets', express.static(process.env.assetsPath as string));

for (const route of router) {
  app.use(route.getRouter())
}

server.listen(process.env.PORT, () => {
  logger.info('listening on *:'+process.env.PORT);
});
