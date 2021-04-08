// ============ Contracts ============
const SaltTrader = artifacts.require("SaltTrader");

const getContractAddress = (_network) => {
  let contractAddr = require(`./config/${_network}Contract.json`)
  return contractAddr
}


// ============ Main Migration ============

const migration = async (deployer, network, accounts) => {
  if (network.indexOf('fork') != -1) {
    return
  }
  this.contract = getContractAddress(network)
  await Promise.all([
    deployContracts(deployer, network),
  ]);
};

module.exports = migration;

// ============ Deploy Functions ============
// This is split across multiple files so that
// if the web3 provider craps out, all progress isn't lost.
//
// This is at the expense of having to do 6 extra txs to sync the migrations
// contract

async function deployContracts(deployer, network) {
  let saltAddr = this.contract.Salt;
  await deployer.deploy(SaltTrader, saltAddr);
}