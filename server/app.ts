import { createProxyMiddleware } from 'http-proxy-middleware';
import express, {Request, Response, NextFunction} from 'express';
import {BigQuery, TableMetadata} from '@google-cloud/bigquery';
// import {Storage} from '@google-cloud/storage';
import { writeFileSync } from 'fs';
import multer from 'multer';

const app: express.Express = express();
const upload = multer();

const log4js = require ('log4js');
const logger = log4js.getLogger ();
logger.level = 'debug';
app.use(log4js.connectLogger(log4js.getLogger('express')));

// const BUCKET = 'bq-column-autocomplete-tool-test';
const datasetId = "sandbox";
const tableId = "my_table";
const options = {
    projectId: 'de-gcp-cft',
};
const bigquery = new BigQuery(options);
// const storage = new Storage(options);

// app.use((req: Request, res: Response, next: NextFunction) => {
//     res.header("Access-Control-Allow-Origin", "*");
//     res.header("Access-Control-Allow-Methods", "*");
//     res.header("Access-Control-Allow-Headers", "*");
//     next();
// });
const token = 'A0DpLSALShLgmtCeTuezdNtpTKQlXlH1A7';
const headers  = {
    "Content-Type": "application/json;charset=utf-8",
    "Authorization": `Bearer ${token}`
}

//then, after all proxys
app.use(
    '/v1',
    createProxyMiddleware({
        target: 'https://api.codic.jp',
        changeOrigin: true,
        secure: false,
        headers: headers,
        logLevel: 'debug'
    })
);

//and now, all no proxy routes
app.use(express.urlencoded({
    extended: true
}));
app.use(express.json());

type TranslatedText = {
    origin: string;
    translated_text: string;
}
type Field = {
    name: string;
    type: string;
    description: string;
}
async function createTable(body: Array<TranslatedText>) {
    let fields = Array<Field>();
    body.forEach((value)=>{
        // console.log(value);
        fields.push({
            name: value.translated_text,
            type: 'string',
            description: value.origin
        })
    })

    // For all options, see https://cloud.google.com/bigquery/docs/reference/v2/tables#resource
    const options: TableMetadata = {
        schema: fields,
        location: 'asia-northeast1'
    };

    const table = await bigquery.dataset(datasetId).table(tableId);
    await table.exists().then(async () => {
        await table.delete();
        console.log(`delete table ${tableId}`);
    }).catch(e => {
        console.log(`not exists ${tableId}.`);
    });
    // Create a new table in the dataset
    const [newTable] = await bigquery
        .dataset(datasetId)
        .createTable(tableId, options).then((res) => {
            return res;
        }).catch(e => {
            console.error(e);
            throw(e);
        });
    console.log(`Table ${newTable.id} created.`);
    return {
        datasetId: datasetId,
        tableId: newTable.id,
        fields: fields
    };
}

function importToTable(
    filepath: string,
    dataset: string,
    table: string,
    fields: Array<Field>) {

    const metadata = {
        sourceFormat: 'CSV',
        skipLeadingRows: 1,
        schema: {
            fields:fields
        },
        location: 'asia-northeast1'
    };
    // Load data from a Google Cloud Storage file into the table
    bigquery
        .dataset(dataset)
        .table(table)
        .load(filepath, metadata)
        .then(job => {
            const job_ = job[0];
            // load() waits for the job to finish
            console.log(`Job ${job_?.id} completed.`);

            // Check the job's status for errors
            const errors = job_?.status?.errors;
            if (errors && errors.length > 0) {
                console.error(errors);
            }
        })
        .catch(e => {console.error(e)});
    // .load(storage.bucket(BUCKET).file(filename), metadata);
    
}

app.post(
    '/create',
    upload.fields([{
        name: 'header',
        maxCount: 1
    },{
        name: 'uploaded_file',
        maxCount: 1
    }]),
    async (req: Request, res: Response, next: NextFunction) => {
        const files = req.files as { [fieldname: string]: Express.Multer.File[] };
        const header_info = JSON.parse(files['header'][0].buffer?.toString('utf-8'));
        console.log(header_info);
        const file = files['uploaded_file'][0].buffer;
        const dest_filepath = `./uploads/${header_info.filename}`;
        try{
            writeFileSync(dest_filepath, file, {flag: 'w', encoding: 'utf-8'});
            const table_info = await createTable(header_info.header);
            if(table_info.tableId){
                importToTable(
                    dest_filepath,
                    table_info.datasetId,
                    table_info.tableId,
                    table_info.fields);
            }
            res.send(JSON.stringify(table_info));
        }catch(e){
            console.error(e);
        }
    }
)

app.listen(3001);
