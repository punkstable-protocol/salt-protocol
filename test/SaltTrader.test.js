const { expectRevert, time } = require('@openzeppelin/test-helpers');
const Salt = artifacts.require('Salt');
const MasterChef = artifacts.require('MasterChef');
const SaltTrader = artifacts.require('SaltTrader');
const MockERC20 = artifacts.require('MockERC20');
const MockProxy = artifacts.require('MockProxy');

contract('SaltTrader', ([alice, bob, carol, minter]) => {
    context('With SaltTrader', () => {
        beforeEach(async () => {
            this.mockProxy = await MockProxy.new();
            this.salt = await Salt.new(this.mockProxy.address, { from: alice });
            this.masterChef = await MasterChef.new(this.salt.address, '500000000000000000', { from: alice });
            this.saltTrader = await SaltTrader.new(this.salt.address, { from: alice });

            await this.salt.addMinter(this.masterChef.address, { from: alice });
            
            this.lp = await MockERC20.new('LPToken', 'LP', '10000000000', { from: minter });
            await this.lp.transfer(alice, '1000', { from: minter });
            await this.lp.transfer(bob, '1000', { from: minter });
            await this.lp.transfer(carol, '1000', { from: minter });

            await this.masterChef.add('1', this.lp.address, true);

            const maxAmount = 1000;
            // 1 ETH
            const fixedPrice = String(10e18);
            const wid = 1;
            await this.salt.create(maxAmount, 0, "", "0x0");
            await this.masterChef.addSalt(wid, maxAmount, fixedPrice);
        });

        it('open order', async () => {
            await this.lp.approve(this.masterChef.address, '1000', { from: bob });
            await this.masterChef.deposit(0, '100', { from: bob });

            await this.masterChef.airDrop({ from: alice });
            assert.equal((await this.masterChef.userSaltBalanceOf(bob, 1)).valueOf(), '1');
            assert.equal((await this.masterChef.saltBalanceOf(1)).valueOf(), '999');

            const claimFee = (await this.masterChef.claimFee(1, 1)).valueOf();

            await this.masterChef.claim(1, 1, { from: bob, value: claimFee });
            assert.equal((await this.salt.balanceOf(bob, 1)).valueOf(), '1');

            await this.salt.setApprovalForAll(this.saltTrader.address, true, { from: bob });

            assert.equal((await this.salt.isApprovedForAll(bob, this.saltTrader.address)).valueOf(), true);

            // 1 ETH
            const price = String(10e18);
            await this.saltTrader.orderSalt(1, price, { from: bob });
            assert.equal((await this.salt.balanceOf(bob, 1)).valueOf(), '0');
            assert.equal((await this.salt.balanceOf(this.saltTrader.address, 1)).valueOf(), '1');
        });

        it('cancel order', async () => {
            await this.lp.approve(this.masterChef.address, '1000', { from: bob });
            await this.masterChef.deposit(0, '100', { from: bob });

            await this.masterChef.airDrop({ from: alice });
            assert.equal((await this.masterChef.userSaltBalanceOf(bob, 1)).valueOf(), '1');
            assert.equal((await this.masterChef.saltBalanceOf(1)).valueOf(), '999');

            const claimFee = (await this.masterChef.claimFee(1, 1)).valueOf();

            await this.masterChef.claim(1, 1, { from: bob, value: claimFee });
            assert.equal((await this.salt.balanceOf(bob, 1)).valueOf(), '1');

            await this.salt.setApprovalForAll(this.saltTrader.address, true, { from: bob });

            assert.equal((await this.salt.isApprovedForAll(bob, this.saltTrader.address)).valueOf(), true);

            // 1 ETH
            const price = String(10e18);
            await this.saltTrader.orderSalt(1, price, { from: bob });
            assert.equal((await this.salt.balanceOf(bob, 1)).valueOf(), '0');
            assert.equal((await this.salt.balanceOf(this.saltTrader.address, 1)).valueOf(), '1');

            await expectRevert(
                this.saltTrader.cancel(1, { from: alice }),
                'not your order',
            );

            await this.saltTrader.cancel(1, { from: bob });
            assert.equal((await this.salt.balanceOf(bob, 1)).valueOf(), '1');
            assert.equal((await this.salt.balanceOf(this.saltTrader.address, 1)).valueOf(), '0');

            await expectRevert(
                this.saltTrader.cancel(1, { from: bob }),
                'only open order can be cancel',
            );
        });

        it('buy salt', async () => {
            await this.lp.approve(this.masterChef.address, '1000', { from: bob });
            await this.masterChef.deposit(0, '100', { from: bob });

            await this.masterChef.airDrop({ from: alice });
            assert.equal((await this.masterChef.userSaltBalanceOf(bob, 1)).valueOf(), '1');
            assert.equal((await this.masterChef.saltBalanceOf(1)).valueOf(), '999');

            const claimFee = (await this.masterChef.claimFee(1, 1)).valueOf();

            await this.masterChef.claim(1, 1, { from: bob, value: claimFee });
            assert.equal((await this.salt.balanceOf(bob, 1)).valueOf(), '1');

            await this.salt.setApprovalForAll(this.saltTrader.address, true, { from: bob });

            assert.equal((await this.salt.isApprovedForAll(bob, this.saltTrader.address)).valueOf(), true);

            // 1 ETH
            const price = String(10e18);
            await this.saltTrader.orderSalt(1, price, { from: bob });
            assert.equal((await this.salt.balanceOf(bob, 1)).valueOf(), '0');
            assert.equal((await this.salt.balanceOf(this.saltTrader.address, 1)).valueOf(), '1');

            await expectRevert(
                this.saltTrader.buySalt(1, { from: bob }),
                'it is your order',
            );

            await expectRevert(
                this.saltTrader.buySalt(1, { from: alice, value: "1234" }),
                'error price',
            );
            let perBalance = await web3.eth.getBalance(bob);
            let buyFee = (Number(price) * 3 / 100);
            let afterBalance = Number(perBalance) + (Number(price) * 97 / 100);
            await this.saltTrader.buySalt(1, { from: alice, value: price });
            assert.equal(await web3.eth.getBalance(bob), afterBalance);
            assert.equal(await web3.eth.getBalance(this.saltTrader.address), buyFee);

            assert.equal((await this.salt.balanceOf(bob, 1)).valueOf(), '0');
            assert.equal((await this.salt.balanceOf(this.saltTrader.address, 1)).valueOf(), '0');
            assert.equal((await this.salt.balanceOf(alice, 1)).valueOf(), '1');

            await expectRevert(
                this.saltTrader.buySalt(1, { from: alice, value: price }),
                'only open order can buy',
            );
        });
    });
});