// ============ Contracts ============
const MasterChef = artifacts.require("MasterChef");
const Salt = artifacts.require("Salt");



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
    if(network != 'test'){
        let salt = await Salt.deployed();
        let masterChef = await MasterChef.deployed();

        let saltAmount = [
            12, // 1
            32, 32, 32, 32, 32, // 5
            128, 128, 128, 128, 128, 128, 128, 128, 128, 128, 128, 128, 128, 128, 128, 128, 128, // 17
            256, 256, 256, 256, 256, 256, 256, 256, 256, 256, 256, 256, 256, 256, // 14
            500, // 1
            256, 256, 256, 256, 256, 256, 256, 256, 256, 256, // 10
            500, // 1
            508 // 1
        ]
        console.log(saltAmount.reduce((a,b)=>a+b));
        let saltID = 1;
        for await (let num of saltAmount) {
            await salt.create(num, 0, "", "0x0");
            let price = "0";
            if(num <= 32) {
                // 1 ETH, fee is 0.03
                price = "1000000000000000000";
            } else if (num <= 256){
                // 0.5 ETH, fee is 0.015
                price = "500000000000000000";
            } else {
                // 0.3333333 ETH, fee is 0.01
                price = "333333333333333333";
            }
            await masterChef.addSalt(saltID, num, price);
            console.log("add salt ", saltID , " amount ", num);
            saltID++;
        }
    }
}
