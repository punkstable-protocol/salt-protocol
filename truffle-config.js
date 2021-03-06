/**
 * Use this file to configure your truffle project. It's seeded with some
 * common settings for different networks and features like migrations,
 * compilation and testing. Uncomment the ones you need or modify
 * them to suit your project as necessary.
 *
 * More information about configuration can be found at:
 *
 * truffleframework.com/docs/advanced/configuration
 *
 * To deploy via Infura you'll need a wallet provider (like @truffle/hdwallet-provider)
 * to sign your transactions before they're sent to a remote public node. Infura accounts
 * are available for free at: infura.io/register.
 *
 * You'll also need a mnemonic - the twelve word phrase the wallet uses to generate
 * public/private key pairs. If you're publishing your code to GitHub make sure you load this
 * phrase from a file you've .gitignored so it doesn't accidentally become public.
 *
 */
const HDWalletProvider = require('@truffle/hdwallet-provider');
const result = require('dotenv').config(); // read .env file saved in project root
if (result.error) {
  throw result.error;
}

// const infuraKey = "fj4jll3k.....";
//
// const fs = require('fs');
// const mnemonic = fs.readFileSync(".secret").toString().trim();

module.exports = {
  /**
   * Networks define how you connect to your ethereum client and let you set the
   * defaults web3 uses to send transactions. If you don't specify one truffle
   * will spin up a development blockchain for you on port 9545 when you
   * run `develop` or `test`. You can ask a truffle command to use a specific
   * network from the command line, e.g
   *
   * $ truffle test --network <network-name>
   */
  // migrations_directory: "./migrations/ignore_migrations",
  migrations_directory: "./migrations/",
  plugins: [
    'truffle-plugin-verify'
  ],
  api_keys: {
    bscscan: process.env.BSC_SCAN_API_KEY
  },
  networks: {
    development: {
      host: '0.0.0.0',
      port: 8545,
      network_id: '5777',
      gasPrice: 20000000000,
      gas: 6000000
    },
    mainnet: {
      network_id: '1',
      provider: () => {
        return new HDWalletProvider(process.env.DEPLOYER_PRIVATE_KEY || '', process.env.INFURA_MAINNET_API)
      },
      gasPrice: 150000000000, // 150 gwei
      gas: 8000000,
      from: process.env.DEPLOYER_ACCOUNT,
      timeoutBlocks: 800,
    },
    kovan: {
      network_id: '42',
      provider: () => {
        return new HDWalletProvider(process.env.TEST_DEPLOYER_PRIVATE_KEY || '', process.env.INFURA_KOVAN_API)
      },
      gasPrice: 10000000000, // 10 gwei
      gas: 6900000,
      from: process.env.DEPLOYER_ACCOUNT,
      timeoutBlocks: 500,
    },
    rinkeby: {
      network_id: '4',
      provider: () => {
        return new HDWalletProvider(process.env.TEST_DEPLOYER_PRIVATE_KEY || '', process.env.INFURA_RINKEBY_API)
      },
      gasPrice: 20000000000, // 10 gwei
      gas: 6900000,
      from: process.env.TEST_DEPLOYER_ACCOUNT,
      timeoutBlocks: 500,
    },
    bnbmainnet: {
      network_id: '56',
      provider: () => {
        return new HDWalletProvider(process.env.DEPLOYER_PRIVATE_KEY || '', process.env.BNB_MAINNET_API)
      },
      gasPrice: 20000000000, // 20 gwei
      gas: 6900000,
      from: process.env.DEPLOYER_ACCOUNT,
      // timeoutBlocks: 500,
      networkCheckTimeout: 60000,
    },
    bnbtestnet: {
      network_id: '97',
      provider: () => {
        return new HDWalletProvider(process.env.TEST_DEPLOYER_PRIVATE_KEY || '', process.env.BNB_TESTNET_API)
      },
      gasPrice: 20000000000, //20 gwei
      gas: 8000000,
      from: process.env.DEPLOYER_ACCOUNT,
      // timeoutBlocks: 500,
      networkCheckTimeout: 60000,
    },
  },
  // Configure your compilers
  compilers: {
    solc: {
      version: '0.6.12',
      docker: false,
      parser: 'solcjs',
      settings: {
        optimizer: {
          enabled: true,
          runs: 50000
        },
        evmVersion: 'istanbul',
      }
    }
  }
};
