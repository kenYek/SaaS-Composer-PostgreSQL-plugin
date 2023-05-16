const { Client } = require('pg')
const express = require('express');
var cors = require('cors')
let config = require('./config.json');
console.log(config)

var app = express();
app.use(cors())
app.use(express.json());

const port = config.port || 2500;

async function getData(req, res) {
    const data = req.body;
    const jsonData = JSON.parse(data.jsondata)
    console.log(` ${data.targets[0].rawSql} `)
    const client = new Client({
        host: jsonData.url,
        port: jsonData.port,
        database: data.database,
        user: data.user,
        password: data.password
    })
    client.connect()
    function query (str) {
        return new Promise((resolve, reject) => {
            client.query(str, (err, result) => {
                resolve(result)
            })    
        })
    }
    const r = {}
    r.errCode = 0;
    r.data = [];
    for (let c = 0; c < data.targets.length; c++) {
        const result = await query(data.targets[c].rawSql)
        console.log(result.rows)
        console.log('****')
        if (data.targets[c].type === 'table') {
            const item = {}
            item.target = data.targets[c].target
            item.type = data.targets[c].type
            item.columns = result.fields.map((item) => {
                return { text: item.name, type: item.format }
            })
            item.rows = result.rows.map((obj) => {
                const ary = []
                for (let i = 0; i < item.columns.length; i++) {
                    ary.push(obj[item.columns[i].text])
                }
                return ary
            })
            item.target = data.targets[c].target;
            item.type = data.targets[c].type;
            r.data.push(item)
        }
        if (data.targets[c].type === 'timeseries') {
            // time_sec, value
            const item = {}
            item.target = data.targets[c].target;
            item.type = data.targets[c].type;
            item.datapoints = []
            item.datapoints = result.rows.map((obj) => {
                const ary = []
                ary.push(obj.value)
                ary.push(obj.time_sec)
                return ary
            })
            r.data.push(item)
        }
    }
    client.end()
    res.json(r);
}

async function checkConnect(req, res) {
    const data = req.body;
    const jsonData = JSON.parse(data.jsondata)
    const client = new Client({
        host: jsonData.url,
        port: jsonData.port,
        database: data.database,
        user: data.user,
        password: data.password
    })
    client.connect((err) => {
        const r = {
            "errCode": 0
        }
        if (err) {
            r.errCode = 1;
            r.data = 'DB connect fail';
        } else {
            r.errCode = 0;
            r.data = 'success';
        }
        client.end()
        res.json(r);
    })
}

app.post('/api/databaseSource/postgres/query', getData)

app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.post('/api/databaseSource/postgres/connect', checkConnect)


app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
  })