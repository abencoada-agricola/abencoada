import {Database} from './database.mjs';
import {readFile} from 'node:fs/promises';
import {applyParitySchema} from './parity-schema.mjs';
const name=process.env.SQL_DATABASE||'app_abencoada';if(!/^[\p{L}][\p{L}\p{N} _-]{0,100}$/u.test(name))throw Error('Invalid database name');
const master=new Database('master');try{await master.query(`IF DB_ID(@name) IS NULL EXEC('CREATE DATABASE [${name}] COLLATE Latin1_General_100_BIN2')`,{name})}finally{master.close()}
const db=new Database(name);try{const installed=await db.query("SELECT OBJECT_ID('app.members') AS id");if(installed[0]?.id)console.log('Existing database preserved: '+name);else{await db.transaction(async()=>await db.query(await readFile(new URL('./schema.sql',import.meta.url),'utf8')));console.log('Created: '+name)}await db.transaction(async()=>applyParitySchema(db,JSON.parse(await readFile(new URL('./parity-contract.json',import.meta.url),'utf8'))));}finally{db.close()}
