// ============ Contracts ============
const MasterChef = artifacts.require("MasterChef");
const Salt = artifacts.require("Salt");

const getContractAddress = (_network) => {
    return require(`./config/${_network}Contract.json`)
}

const getCardInfo = (_network) => {
    return require(`./config/${_network}CardInfo.json`)
}

// add new cards
// const addCardList = [1, 2, 3, 4, 5, 6, 7, 8]
const addCardList = [17, 18, 19]

// ============ Main Migration ============

const migration = async (deployer, network, accounts) => {
    await Promise.all([
        addSalts(deployer, network),
    ]);
};

module.exports = migration;

// ============ Deploy Functions ============
// This is split across multiple files so that
// if the web3 provider craps out, all progress isn't lost.
//
// This is at the expense of having to do 6 extra txs to sync the migrations
// contract

async function addSalts(deployer, network) {
    if (network.indexOf('fork') != -1) {
        return
    }
    let contract = getContractAddress(network)
    let cardItem = getCardInfo(network)
    let saltTotal = 0
    if (network == "development") {
        this.salt = await Salt.deployed();
        this.masterChef = await MasterChef.deployed();
        console.log(`development => saltAddress:${salt.address}, masterChefAddress:${masterChef.address}`)
    } else {
        this.salt = await Salt.at(contract.Salt)
        this.masterChef = await MasterChef.at(contract.MasterChef)
    }
    for (let cardId in cardItem) {
        if (addCardList.indexOf(parseInt(cardId)) == -1) {
            continue
        }
        let card = cardItem[cardId]
        let amount = card.amount.toString()
        let price = card.price.toString()
        let level = card.level
        let name = card.name
        await this.salt.create(amount, 0, "", "0x0")
        // Claim fee is 3%.
        // Pool's fee 1%. Artist's fee 2%.
        // 1 ETH, fee is 0.03
        await this.masterChef.addSalt(cardId, amount, price)
        saltTotal += parseInt(amount)
        console.log(`add salt, SaltID: ${cardId}, amount: ${amount}, level: ${level}, name: ${name}`)
    }
    console.log("Salt Total: ", saltTotal)
}
