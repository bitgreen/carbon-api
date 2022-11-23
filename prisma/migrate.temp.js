const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const load = async () => {
    try {
        // create POLKADOT network
        const polkadot = await prisma.Network.create({
            data: {
                name: 'POLKADOT',
                hash: '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3'
            }
        })

        // create KUSAMA network
        const kusama = await prisma.Network.create({
            data: {
                name: 'KUSAMA',
                hash: '0xb0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe'
            }
        })

        // create MOONBEAM network
        const moonbeam = await prisma.Network.create({
            data: {
                name: 'MOONBEAM',
                parentNetwork: 'POLKADOT',
                hash: '0xfe58ea77779b7abda7da4ec526d14db9b1e9cd40a217c34892af80a9b332b76d'
            }
        })

        await prisma.Node.updateMany({
            where: {
                network: 'POLKADOT',
                subNetwork: ''
            },
            data: {
                networkId: polkadot.id
            }
        })

        await prisma.Node.updateMany({
            where: {
                network: 'KUSAMA',
                subNetwork: ''
            },
            data: {
                networkId: kusama.id
            }
        })

        await prisma.Node.updateMany({
            where: {
                network: 'POLKADOT',
                subNetwork: 'MOONBEAM'
            },
            data: {
                networkId: moonbeam.id
            }
        })
    } catch (e) {
        console.error(e)
        process.exit(1)
    } finally {
        await prisma.$disconnect()
    }
}

load()