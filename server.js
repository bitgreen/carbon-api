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

app.post('/nodes', async function (req, res) {
    const { type_query, network_query } = nodeFilters(req)

    const nodes = await prisma.Node.findMany({
        where: {
            ...type_query,
            ...network_query
        },
        include: {
            periodFirstSeen: true,
            periodLastSeen: true,
        }
    });

    res.send(exclude_field(nodes, 'periodFirstSeenId', 'periodLastSeenId'));
});

app.post('/periods', async function (req, res) {
    const { type_query, network_query } = nodeFilters(req)

    const periods = await prisma.Period.findMany({
        where: {},
        include: {
            seenNodes: {
                where: {
                    node: {
                        ...type_query,
                        ...network_query
                    }
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
        period.seenNodesCount = period.seenNodes.length
    }

    res.send(exclude_field(periods));
});

app.post('/report/daily', async function (req, res) {
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

function nodeFilters(req) {
    let network = req.body.network
    let type = req.body.type
    let network_query = null
    let type_query = null

    if(type === 'node') {
        type_query = {
            type: 'Node'
        }
    } else if(type === 'validator') {
        type_query = {
            type: 'Validator'
        }
    }

    if(network === 'POLKADOT' || network === 'KUSAMA') {
        network_query = {
            network: network,
            subNetwork: ''
        }
    } else {
        network_query = {
            subNetwork: network
        }
    }

    return {
        type_query, network_query
    }
}