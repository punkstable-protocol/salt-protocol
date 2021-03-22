const { expectRevert, time } = require('@openzeppelin/test-helpers');
const Salt = artifacts.require('Salt');
const MasterChef = artifacts.require('MasterChef');
const MockERC20 = artifacts.require('MockERC20');

contract('Salt', ([alice, bob, carol, minter]) => {
    context('With Salt', () => {
        beforeEach(async () => {
            this.salt = await Salt.new('0xa5409ec958c83c3f309868babaca7c86dcb077c1', { from: alice });
            this.masterChef = await MasterChef.new(this.salt.address, '100000000000000000000', '0', { from: alice });
            await this.salt.addMinter(this.masterChef.address, { from: alice });

            this.lp = await MockERC20.new('LPToken', 'LP', '10000000000', { from: minter });
            await this.lp.transfer(alice, '1000', { from: minter });
            await this.lp.transfer(bob, '1000', { from: minter });
            await this.lp.transfer(carol, '1000', { from: minter });

            await this.masterChef.add('100', this.lp.address, true);

            const maxAmount = 1000;
            // 0.01 ETH
            const fixedPrice = String(0.01 * 10e18);
            const wid = 1;
            await this.salt.create(maxAmount, 0, "", "0x0");
            await this.masterChef.addSalt(wid, maxAmount, fixedPrice);
        });

        it('should draw salt only the tickets more ticketsConsumed', async () => {
            await this.lp.approve(this.masterChef.address, '1000', { from: bob });
            await time.advanceBlockTo('21');
            await this.masterChef.deposit(0, '100', { from: bob });
            await time.advanceBlockTo('23');
            await this.masterChef.deposit(0, '0', { from: bob });
            await time.advanceBlockTo('25');
            assert.equal((await this.masterChef.ticketBalanceOf(bob)).valueOf(), '200000000000000000000');
            await expectRevert(
                this.masterChef.draw({ from: bob }),
                'Tickets are not enough.',
            );
            await time.advanceBlockTo('31');
            await this.masterChef.deposit(0, '0', { from: bob });
            assert.equal((await this.masterChef.ticketBalanceOf(bob)).valueOf(), '1000000000000000000000');
            await this.masterChef.draw({ from: bob });
            assert.equal((await this.masterChef.ticketBalanceOf(bob)).valueOf(), '0');
            await expectRevert(
                this.masterChef.draw({ from: bob }),
                'Tickets are not enough.',
            );
            assert.equal((await this.masterChef.userSaltBalanceOf(bob, 1)).valueOf(), '1');
            assert.equal((await this.masterChef.saltBalanceOf(1)).valueOf(), '999');

            let userSalt = await this.masterChef.userUnclaimSalt(bob).valueOf();
            assert.equal(userSalt[0], '0');
            assert.equal(userSalt[1], '1');
        });

        it('should claim salt amount and need pay fee', async () => {
            await this.lp.approve(this.masterChef.address, '1000', { from: bob });
            await time.advanceBlockTo('45');
            await this.masterChef.deposit(0, '100', { from: bob });
            await time.advanceBlockTo('55');
            await this.masterChef.deposit(0, '0', { from: bob });
            await this.masterChef.draw({ from: bob });

            const claimFee = (await this.masterChef.claimFee(1, 1)).valueOf();

            await expectRevert(
                this.masterChef.claim(1, 0, { from: bob }),
                'amount must not zero',
            );

            await expectRevert(
                this.masterChef.claim(1, 2, { from: bob }),
                'amount is bad',
            );
            await expectRevert(
                this.masterChef.claim(1, 1, { from: bob }),
                'need payout claim fee',
            );
            await this.masterChef.claim(1, 1, { from: bob, value: claimFee });
            assert.equal((await this.salt.balanceOf(bob, 1)).valueOf(), '1');
        });

        it('should airdrop by owner', async () => {
            await this.lp.approve(this.masterChef.address, '1000', { from: bob });
            await this.masterChef.deposit(0, '100', { from: bob });

            await expectRevert(
                this.masterChef.airDrop({ from: bob }),
                'Ownable: caller is not the owner',
            );

            await this.masterChef.airDrop({ from: alice });
            assert.equal((await this.masterChef.userSaltBalanceOf(bob, 1)).valueOf(), '1');
            assert.equal((await this.masterChef.saltBalanceOf(1)).valueOf(), '999');
        });
    });
});