const express = require('express')
const cors = require('cors')
const dotenv = require('dotenv')
const app = express()
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

/* config */
dotenv.config();
const port = process.env.API_PORT || 3000

const networks = require('./networks.json')
const fetch_networks = process.env.FETCH_NETWORKS.split(',')

app.use(express.urlencoded({extended: true}));
app.use(express.json({ limit: '64mb' }));

app.use(cors());

app.get('/', function (req, res) {
    res.send('Hello from Bitgreen!');
});

app.get('/networks', function (req, res) {
    let all_networks = []

    for(let n of fetch_networks) {
        let network = networks[n.toUpperCase()]

        if(!network) {
            network = networks['POLKADOT']['parachains'][n.toUpperCase()]
        }

        if(!network) {
            network = networks['KUSAMA']['parachains'][n.toUpperCase()]
        }

        if(network) {
            all_networks.push({
                'network': n.toUpperCase(),
                'hash': network.hash,
            })
        }
    }

    res.send(all_networks);
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

    let { start_date, end_date } = req.body
    start_date = Date.parse(start_date)
    end_date = Date.parse(end_date)

    let date_query = {
        start: {},
        end: {}
    }

    if(start_date) {
        date_query.start.gte = new Date(start_date)
    }

    if(end_date) {
        date_query.end.lte = new Date(end_date)
    }

    const periods = await prisma.Period.findMany({
        where: {
            ...date_query
        },
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
    const { type_query, network_query } = nodeFilters(req)

    let { start_date, end_date } = req.body
    start_date = Date.parse(start_date)
    end_date = Date.parse(end_date)

    let date_query = {
        day: {},
    }

    if(start_date) {
        date_query.day.gte = new Date(start_date)
    }

    if(end_date) {
        date_query.day.lte = new Date(end_date)

    }

    const day_reports = await prisma.DayReport.findMany({
        where: {
            ...date_query
        },
        include: {
            seenNodes: {
                where: {
                    node: {
                        ...type_query,
                        ...network_query
                    }
                },
                include: {
                    node: true
                }
            }
        }
    });

    // Display only node IDs and calculate totals
    for (let day_report of day_reports) {
        day_report.seenNodesCount = {
            'nodes': 0,
            'validators': 0,
            'collators': 0,
            'all': 0
        }

        let nodes = day_report.seenNodes;
        day_report.seenNodes = []
        for(let node of nodes) {
            day_report.seenNodes.push(node.nodeId)

            if(node.node.type === 'Node') {
                day_report.seenNodesCount.nodes++
            } else if(node.node.type === 'Validator') {
                day_report.seenNodesCount.validators++
            } else if(node.node.type === 'Collator') {
                day_report.seenNodesCount.collators++
            }
        }
        day_report.seenNodesCount.all = day_report.seenNodes.length
    }

    res.send(exclude_field(day_reports, 'id'));
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