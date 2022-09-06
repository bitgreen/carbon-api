const express = require('express')
const cors = require('cors')
const dotenv = require('dotenv')
const app = express()
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

/* config */
dotenv.config();
const port = process.env.API_PORT || 3000

app.use(express.urlencoded({extended: true}));
app.use(express.json());

app.use(cors());

app.get('/', function (req, res) {
    res.send('Hello from Bitgreen!');
});

app.get('/nodes', async function (req, res) {
    const nodes = await prisma.Node.findMany({

    });

    res.send(exclude_field(nodes, 'periodFirstSeen', 'periodLastSeen'));
});

app.get('/period', async function (req, res) {
    const periods = await prisma.Period.findMany({
        select: {
            start: true,
            end: true,
            seenNodes: {
                select: {
                    nodeId: true
                }
            }
        }
    });

    // Display only node IDs
    for (let period of periods) {
        let nodes = period.seenNodes;
        period.seenNodes = []
        for(let node of nodes) {
            period.seenNodes.push(node.nodeId)
        }
    }

    res.send(exclude_field(periods));
});

app.get('/report/daily', async function (req, res) {
    const reports = await prisma.DayReport.findMany({

    });

    res.send(exclude_field(reports, 'id'));
});

/* serve api */
const server = app.listen(port, function () {
    console.log(`API server is listening at: http://localhost:${port}.`)
});

function exclude_field(rows, ...keys) {
    for (let row of rows) {
        for (let key of keys) {
            delete row[key]
        }
    }

    return rows
}