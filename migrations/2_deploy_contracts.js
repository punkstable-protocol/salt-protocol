// ============ Contracts ============
const MasterChef = artifacts.require("MasterChef");
const Salt = artifacts.require("Salt");
const { writeFile, unlinkFile } = require("../utils/fsFile");

const contractAddressFile = "deployedContract.txt"

const getProxyRegistryAddress = (_network) => {
    switch (_network) {
        case "bnbmainnet":
            return "0x0000000000000000000000000000000000000000"
        case "bnbtestnet":
            return "0x0000000000000000000000000000000000000000"
        case "development":
            return "0x0000000000000000000000000000000000000000"
        case "rinkeby":
            return "0x0000000000000000000000000000000000000000"
        default:
            return "0x0000000000000000000000000000000000000000"
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
            // 10 tickets per block
            return "10000000000000000000"
        case "bnbtestnet":
            // 10 tickets per block
            return "10000000000000000000"
        case "development":
            // 100 tickets per block
            return "100000000000000000000"
        case "rinkeby":
            // 100 tickets per block
            return "100000000000000000000"
        default:
            // 10 tickets per block
            return "10000000000000000000"
    }
}

// ============ Main Migration ============

const migration = async (deployer, network, accounts) => {
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
    let deployTime = new Date()
    if (network != 'test') {
        // OpenSea proxy registry addresses for rinkeby and mainnet.
        let proxyRegistryAddress = getProxyRegistryAddress(network);
        await deployer.deploy(Salt,
            proxyRegistryAddress
        );

        // 10 tickets per block
        let ticketPerBlock = getTicketPerBlock(network);
        let startBlock = getStartBlock(network);
        await deployer.deploy(MasterChef,
            Salt.address,
            ticketPerBlock,
            startBlock
        );
        let salt = await Salt.deployed();
        let masterChef = await MasterChef.deployed();
        await salt.addMinter(masterChef.address);
        writeFile(contractAddressFile, `\ndeployed time: ${deployTime.toUTCString()}\n`)
        writeFile(contractAddressFile, `Salt: ${salt.address}\n`)
        writeFile(contractAddressFile, `MasterChef: ${masterChef.address}\n`)
    }
}
