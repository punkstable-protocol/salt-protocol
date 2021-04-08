// ============ Contracts ============
const MasterChef = artifacts.require("MasterChef")
const Salt = artifacts.require("Salt")
const poolsInfo = require("./config/poolInfo.json")

const getContractAddress = (_network) => {
    let contractAddr = require(`./config/${_network}Contract.json`)
    return contractAddr
}

// Pool to be added
const addPoolList = [0, 1, 2]


// ============ Main Migration ============

const migration = async (deployer, network, accounts) => {
    if (network.indexOf('fork') != -1) {
        return
    }
    this.contract = getContractAddress(network)
    await Promise.all([
        addPools(deployer, network),
    ]);
};

module.exports = migration;

// ============ Deploy Functions ============
// This is split across multiple files so that
// if the web3 provider craps out, all progress isn't lost.
//
// This is at the expense of having to do 6 extra txs to sync the migrations
// contract

async function addPools(deployer, network) {
    if (network == "development") {
        this.salt = await Salt.deployed();
        this.masterChef = await MasterChef.deployed();
        console.log(`development => saltAddress:${salt.address}, masterChefAddress:${masterChef.address}`)
    } else {
        this.masterChef = await MasterChef.at(this.contract.MasterChef)
    }
    for (let poolId in poolsInfo) {
        if (addPoolList.indexOf(parseInt(poolId)) == -1) {
            continue
        }
        let pool = poolsInfo[poolId]
        let name = pool.name
        let seedTokenAddr = this.contract[pool.seedToken]
        await this.masterChef.add('1', seedTokenAddr, true)
        console.log(`pool id: ${poolId}, pool name: ${name}`)
    }
}
