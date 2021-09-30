import express, {Request, Response, NextFunction} from 'express';
import {BigQuery, TableMetadata} from '@google-cloud/bigquery';
import { writeFileSync } from 'fs';
import multer from 'multer';
import config from 'dotenv';
 
config.config(); // load .env
const app: express.Express = express();
const upload = multer();

const log4js = require ('log4js');
const logger = log4js.getLogger ();
logger.level = 'debug';
app.use(log4js.connectLogger(log4js.getLogger('express')));

// app.use((req: Request, res: Response, next: NextFunction) => {
//     res.header("Access-Control-Allow-Origin", "*");
//     res.header("Access-Control-Allow-Methods", "*");
//     res.header("Access-Control-Allow-Headers", "*");
//     next();
// });

//and now, all no proxy routes
app.use(express.urlencoded({
    extended: true
}));
app.use(express.json());

const datasetId = process.env.DATASET_ID || 'missing';
const LOCATION = process.env.LOCATION;
const options = {
    projectId: process.env.PROJECT_ID,
    location: LOCATION
};
const bigquery = new BigQuery(options);

type TranslatedText = {
    origin: string;
    translated_text: string;
    dtype: string;
}
type Field = {
    name: string;
    type: string;
    description: string;
}
async function createTable(body: Array<TranslatedText>, tableId: string) {
    let fields = Array<Field>();
    body.forEach((value)=>{
        fields.push({
            name: value.translated_text,
            type: value.dtype,
            description: value.origin
        })
    })

    // For all options, see https://cloud.google.com/bigquery/docs/reference/v2/tables#resource
    const options: TableMetadata = {
        schema: fields,
        location: LOCATION
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

async function importToTable(
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
        location: LOCATION
    };
    // Load data from a Google Cloud Storage file into the table
    bigquery
        .dataset(dataset)
        .table(table)
        .load(filepath, metadata)
        .then(results => {
            const job = results[0];
            // load() waits for the job to finish
            console.log(`Job ${job?.id} completed.`);

            // Check the job's status for errors
            const errors = job?.status?.errors;
            if (errors && errors.length > 0) {
                console.error(errors);
            }
        })
        .catch(e => {
            throw(e);
        });
}

app.post(
    '/create',
    upload.fields([{
        name: 'header_info',
        maxCount: 1
    },{
        name: 'uploaded_file',
        maxCount: 1
    }]),
    async (req: Request, res: Response, next: NextFunction) => {
        const files = req.files as { [fieldname: string]: Express.Multer.File[] };
        const header_info = JSON.parse(files['header_info'][0].buffer?.toString('utf-8'));
        console.log(header_info);
        const file = files['uploaded_file'][0].buffer;
        const dest_filepath = `./uploads/${header_info.filename}`;
        try{
            writeFileSync(dest_filepath, file, {flag: 'w', encoding: 'utf-8'});
            const table_info = await createTable(header_info.header, header_info.table_name);
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
            // res.status(500);
            res.send(JSON.stringify({error_reason: String(e)}));
        }
    }
)

app.listen(3001);
