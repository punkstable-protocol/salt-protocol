// ============ Contracts ============
const MasterChef = artifacts.require("MasterChef");
const Salt = artifacts.require("Salt");
const MockProxy = artifacts.require('MockProxy');
const { writeFile, unlinkFile } = require("../utils/fsFile");

const contractAddressFile = (_network) => {
    let deployedFile = "deployedContract.txt"
    let testDeployedFile = "testDeployedContract.txt"
    switch (_network) {
        case "bnbmainnet":
        case "mainnet":
            return deployedFile
        default:
            return testDeployedFile
    }
}


const getStartBlock = (_network) => {
    switch (_network) {
        case "bnbmainnet":
            // Mar-23-2021 06:47:25 AM +UTC
            return 5924835
        case "bnbtestnet":
            // Mar-23-2021 06:47:25 AM +UTC
            return 5924835
        case "development":
            return 0
        case "rinkeby":
            return 0
        default:
            return 0
    }
}

const getTicketPerBlock = (_network) => {
    switch (_network) {
        case "bnbmainnet":
            // 0.5 tickets per block
            return "500000000000000000"
        case "bnbtestnet":
            // 0.5 tickets per block
            return "500000000000000000"
        case "development":
            // 0.5 tickets per block
            return "500000000000000000"
        case "rinkeby":
            // 0.5 tickets per block
            return "500000000000000000"
        default:
            // 0.5 tickets per block
            return "500000000000000000"
    }
}

// ============ Main Migration ============

const migration = async (deployer, network, accounts) => {
    if (network.indexOf('fork') != -1) {
        return
    }
    await Promise.all([
        deployMainContracts(deployer, network),
    ]);
};

module.exports = migration;

// ============ Deploy Functions ============
// This is split across multiple files so that
// if the web3 provider craps out, all progress isn't lost.
//
// This is at the expense of having to do 6 extra txs to sync the migrations
// contract

async function deployMainContracts(deployer, network) {
    if (network != 'test') {
        let deployTime = new Date();
        // saltTrader proxy registry addresses.
        await deployer.deploy(MockProxy)
        await deployer.deploy(Salt,
            MockProxy.address
        );

        // 10 tickets per block
        let ticketPerBlock = getTicketPerBlock(network);
        await deployer.deploy(MasterChef,
            Salt.address,
            ticketPerBlock
        );
        let salt = await Salt.deployed();
        let masterChef = await MasterChef.deployed();
        await salt.addMinter(masterChef.address);
        writeFile(contractAddressFile(network), `\ndeployed time: ${deployTime.toUTCString()}\n`)
        writeFile(contractAddressFile(network), `Salt: ${salt.address}\n`)
        writeFile(contractAddressFile(network), `MasterChef: ${masterChef.address}\n`)
        writeFile(contractAddressFile(network), `mockProxy: ${MockProxy.address}\n`)
    }
}
