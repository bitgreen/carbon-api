const WebSocket = require('ws');
const CronJob = require('cron').CronJob;
const { PrismaClient } = require('@prisma/client')
const dotenv = require("dotenv");
const prisma = new PrismaClient()

/* config */
dotenv.config();

const networks = {
    POLKADOT: {
        hash: '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3',
        parachains: {
            MOONBEAM: {
                hash: '0xfe58ea77779b7abda7da4ec526d14db9b1e9cd40a217c34892af80a9b332b76d',
            }
        }
    },
    KUSAMA: {
        hash: '0xb0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe',
        parachains: {
            KHALA: {
                hash: '0xd43540ba6d3eb4897c28a77d48cb5b729fea37603cbbfc7a86a73b72adb3be8d',
            }
        }
    }
}

let period
let period_start_time
let period_end_time
let job = new CronJob(
    '*/30 * * * *', // every 30 minutes
    startLoop
);
job.start()


// Todo: add cron job for DayReport

async function startLoop() {
    console.log('here')
    period_start_time = new Date();
    period_start_time = new Date(Math.round(period_start_time.getTime() / (1000 * 60 * 30)) * (1000 * 60 * 30)) // round it to the nearest minute
    period_end_time = new Date(period_start_time.getTime() + 1000 * 60 * 30)

    period = await prisma.Period.upsert({
        where: {
            uniqueId: {
                start: period_start_time.toISOString(),
                end: period_end_time.toISOString()
            }
        },
        update: {},
        create: {
            start: period_start_time.toISOString(),
            end: period_end_time.toISOString(),
        }
    })

    const fetch_networks = process.env.FETCH_NETWORKS.split(',')

    let promise_call = []
    for(let network in fetch_networks) {
        network = fetch_networks[network].toUpperCase()

        promise_call.push(getByNetwork(network))
    }

    await Promise.all(promise_call);
}

async function getByNetwork(network = 'POLKADOT') {
    let chain = networks[network]
    let parachain = null
    let sub_network = null

    if(!chain) {
        parachain = networks['POLKADOT']['parachains'][network]
        if(parachain) {
            sub_network = network
            network = 'POLKADOT'
            chain = networks['POLKADOT']
        }
    }

    if(!chain && !parachain) {
        parachain = networks['KUSAMA']['parachains'][network]
        if(parachain) {
            sub_network = network
            network = 'POLKADOT'
            chain = networks['KUSAMA']
        }
    }

    if(!chain) {
        console.log('Chain not found: ' + network)
        return false;
    }

    if(!sub_network) {
        sub_network = ''
    }

    const ws = new WebSocket('wss://feed.telemetry.polkadot.io/feed')

    ws.on('open', function() {
        ws.send('subscribe:' + chain.hash)
    });

    ws.on('message', async function(data, flags) {
        let utf8decoder = new TextDecoder('utf-8')

        data = utf8decoder.decode(data)
        let messages = deserialize(data)

        for (const message of messages) {
            // AddedNode
            if(message.action === 3) {
                const [
                    id,
                    nodeDetails,
                    nodeStats,
                    nodeIO,
                    nodeHardware,
                    blockDetails,
                    location,
                    startupTime,
                ] = message.payload;

                const name = nodeDetails[0].trim()
                const validator = nodeDetails[3] // validator address
                const network_id = nodeDetails[4]
                const latitude = location && location[0] ? parseFloat(location[0]) : 0.00
                const longitude = location && location[1] ? parseFloat(location[1]) : 0.00
                const city = location && location[2] ? location[2] : ''

                let type = 'Node'
                if(validator) {
                    type = 'Validator'
                }

                try {
                    const node = await prisma.Node.upsert({
                        where: {
                            uniqueId: {
                                name: name,
                                type: type,
                                network: network,
                                subNetwork: sub_network,
                                latitude: latitude,
                                longitude: longitude
                            }
                        },
                        update: {
                            periodLastSeenId: period.id,
                            type: type
                        },
                        create: {
                            name: name,
                            type: type,
                            network: network,
                            subNetwork: sub_network,
                            latitude: latitude,
                            longitude: longitude,
                            city: city,
                            periodFirstSeenId: period.id,
                            periodLastSeenId: period.id
                        },
                    })

                    const node_on_period = await prisma.NodesOnPeriods.upsert({
                        where: {
                            uniqueId: {
                                periodId: period.id,
                                nodeId: node.id
                            }
                        },
                        update: {},
                        create: {
                            nodeId: node.id,
                            periodId: period.id
                        }
                    });
                } catch (e) {
                    console.log('error saving node')
                }
            }

            // RemovedNode
            if(message.action === 4) {
                const id = message.payload;
            }

            // SubscribedTo
            if(message.action === 13) {
                console.log('subscribed to ' + (sub_network ? sub_network + ' - ' : '') + network  + ': ' + message.payload)
            }

            // UnsubscribedFrom
            if(message.action === 14) {
                // finalize()
                console.log('unsubscribed from ' + message.payload)
            }
        }
    });

    setTimeout(function() {
        ws.close()
    }, 60 * 1000 * 30)
}

function deserialize(data) {
    const json = JSON.parse(data);

    if (!Array.isArray(json) || json.length === 0 || json.length % 2 !== 0) {
        throw new Error('Invalid FeedMessage.Data');
    }

    const messages = new Array(json.length / 2);

    for (const index of messages.keys()) {
        const [action, payload] = json.slice(index * 2);

        messages[index] = { action, payload };
    }

    return messages;
}