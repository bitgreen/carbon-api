const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const Chance = require('chance');

const chance = new Chance();

const load = async () => {
    try {
        await prisma.NodesOnPeriods.deleteMany()
        console.log('Deleted records in NodesOnPeriods table')

        await prisma.Node.deleteMany()
        console.log('Deleted records in Node table')

        await prisma.Period.deleteMany()
        console.log('Deleted records in Period table')

        await prisma.DayReport.deleteMany()
        console.log('Deleted records in DayReport table')

        let start_time = new Date();
        start_time = new Date(Math.round(start_time.getTime() / (1000 * 60 * 60)) * (1000 * 60 * 60)) // round it to the nearest minute
        start_time = new Date(start_time.getTime() - (1000 * 60 * 60 * 48))
        for (let i = 0; i < 48; i++) {
            let end_time = new Date(start_time.getTime() + (1000 * 60 * 60))
            await prisma.Period.create({
                data: {
                    start: start_time.toISOString(),
                    end: end_time.toISOString(),
                }
            })
            start_time = end_time;
        }
        console.log('Added Period data')

        const periods = await prisma.Period.findMany()
        for (let i = 0; i < 1000; i++) {
            let connect_periods = []
            for (let i = 0; i < periods.length; i++) {
                let period = periods[i]
                if(chance.bool({likelihood: 90})) {
                    connect_periods.push({
                        period: {
                            connect: {
                                id: period.id
                            }
                        }
                    })
                }
            }

            await prisma.Node.create({
                data: {
                    type: chance.bool({likelihood: 30}) ? (chance.bool() ? 'Collator' : 'Validator') : (chance.bool() ? 'Client' : 'Node'),
                    name: chance.word({ length: 5 }) + '-' + chance.word({ length: 10 }),
                    network: chance.bool() ? 'KUSAMA' : 'POLKADOT',
                    latitude: chance.latitude(),
                    longitude: chance.longitude(),
                    city: chance.city(),
                    periods: {
                        create: connect_periods
                    }
                }
            })
        }
        console.log('Added Node data')
        console.log('Added NodePeriod data')

        let report_time = new Date();
        report_time = new Date(Math.round(report_time.getTime() / (1000 * 60 * 60 * 24)) * (1000 * 60 * 60 * 24)) // round it to the nearest day
        report_time = new Date(report_time.getTime() - (1000 * 60 * 60 * 24 * 50))
        for (let i = 0; i < 50; i++) {
            await prisma.DayReport.create({
                data: {
                    day: report_time.toISOString(),
                    validators: chance.integer({ min: 40, max: 140 }),
                    collators: chance.integer({ min: 60, max: 160 }),
                    nodes: chance.integer({ min: 420, max: 820 }),
                    clients: chance.integer({ min: 220, max: 420 })
                }
            })

            report_time =  new Date(report_time.getTime() + (1000 * 60 * 60 * 24));
        }
        console.log('Added DayReport data')
    } catch (e) {
        console.error(e)
        process.exit(1)
    } finally {
        await prisma.$disconnect()
    }
}

load()