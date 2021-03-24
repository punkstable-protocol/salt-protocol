// ============ Contracts ============
const MasterChef = artifacts.require("MasterChef");
const airdropList = require("../data/airdropTickets-list.json")
const { writeFile, unlinkFile } = require("../utils/fsFile")


const MasterChefAddress = (_network) => {
    switch (_network) {
        case "bnbmainnet":
            return "0x728Ca2bC6280a4f0E184A4FDa8Ea45C17E65A195"
        case "bnbtestnet":
            return "0x6F228721EaE6633AEe6Aa1e6ecC5D26F745A869B"
        case "development":
            return "0xeB544FCd89d5FF2f271662D0187146241f94a0EC"
        case "rinkeby":
            return "0x6f698caBe9898fEc0F9A327fE3B05006A9584C17"
        default:
            return ""
    }
}

// ============ Main Migration ============

const migration = async (deployer, network, accounts) => {
    await Promise.all([
        airDropTickets(deployer, network),
    ]);
};

module.exports = migration;

// ============ Deploy Functions ============
// This is split across multiple files so that
// if the web3 provider craps out, all progress isn't lost.
//
// This is at the expense of having to do 6 extra txs to sync the migrations
// contract

async function airDropTickets(deployer, network) {
    let masterChef = await MasterChef.at(MasterChefAddress(network))
    let accounts = []
    let amounts = []
    let loop = 0
    let limit = 500
    unlinkFile('err.log')
    for (let airdrop in airdropList) {
        accounts.push(airdrop)
        amounts.push(airdropList[airdrop].toString())
    }
    let startTimestamp = new Date().getTime()
    while (loop < accounts.length) {
        let newAccounts = accounts.slice(loop, loop + limit)
        let newAmounts = amounts.slice(loop, loop + limit)
        try {
            await masterChef.airDropTickets(newAccounts, newAmounts)
            process.stdout.write(".")
        } catch (error) {
            let errMsg = `error: airdropTickets -> ${newAccounts}, msg: ${error}\n`
            writeFile('err.log', errMsg)
            process.stdout.write("X")
        } finally {
            loop += limit
        }
    }
    let endTimestamp = new Date().getTime()
    console.log(`\ntime consuming：${endTimestamp - startTimestamp}`)
}