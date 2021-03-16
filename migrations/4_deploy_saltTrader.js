// ============ Contracts ============
const Salt = artifacts.require("Salt");
const SaltTrader = artifacts.require("SaltTrader");



// ============ Main Migration ============

const migration = async (deployer, network, accounts) => {
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
    if(network != 'test'){
        let salt = await Salt.deployed();
        await deployer.deploy(SaltTrader,
            salt.address,
        );
    }
}
