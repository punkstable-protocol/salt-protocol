// ============ Contracts ============
const MasterChef = artifacts.require("MasterChef");
const airdropList = require("../data/airdropTickets-list.json")
const { writeFile, unlinkFile } = require("../utils/fsFile")
const { balance } = require('@openzeppelin/test-helpers');


const MasterChefAddress = (_network) => {
    switch (_network) {
        case "bnbmainnet":
            return "0x728Ca2bC6280a4f0E184A4FDa8Ea45C17E65A195"
        case "bnbtestnet":
            return "0x856Fe673FDE3d869ea6877795ee3a7a778E764bc"
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
        airDropTickets(deployer, network, accounts[0]),
    ]);
};

module.exports = migration;

// ============ Deploy Functions ============
// This is split across multiple files so that
// if the web3 provider craps out, all progress isn't lost.
//
// This is at the expense of having to do 6 extra txs to sync the migrations
// contract

async function airDropTickets(deployer, network, account) {
    let masterChef = await MasterChef.at(MasterChefAddress(network))
    let accountList = []
    let amounts = []
    let loop = 0
    let limit = 200
    let failNum = 0
    for (let airdrop in airdropList) {
        accountList.push(airdrop)
        amounts.push(airdropList[airdrop].toString())
    }
    console.log(`airdrop account amount: ${accountList.length}`)
    let now = new Date()
    let startTimestamp = now.getTime()
    writeFile('arirdroped.txt', `\n ${now.toLocaleString()}\n`)
    while (loop < accountList.length) {
        let newAccounts = accountList.slice(loop, loop + limit)
        let newAmounts = amounts.slice(loop, loop + limit)
        try {
            await masterChef.airDropTickets(newAccounts, newAmounts)
            for (let i = 0; i < newAccounts.length; i++) {
                writeFile('arirdroped.txt', `${newAccounts[i]},${newAmounts[i]}\n`)
            }
            process.stdout.write(".")
        } catch (error) {
            let errMsg = `error: airdropTickets -> ${newAccounts}, msg: ${error}\n`
            writeFile('err.log', errMsg)
            for (let i = 0; i < newAccounts.length; i++) {
                failNum += 1
                writeFile('airdropFail.log', `${newAccounts[i]},${newAmounts[i]}\n`)
            }
            process.stdout.write("X")
        } finally {
            loop += limit
        }
    }
    writeFile('airdropFail.log', "\n")
    let endTimestamp = new Date().getTime()
    console.log(`\ntime consuming：${endTimestamp - startTimestamp}`)
    console.log(`airdrop fail account: ${failNum}`)
}