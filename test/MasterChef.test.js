const { expectRevert, time, BN } = require('@openzeppelin/test-helpers');
const Salt = artifacts.require('Salt');
const MasterChef = artifacts.require('MasterChef');
const MockERC20 = artifacts.require('MockERC20');

contract('MasterChef', ([alice, bob, carol, minter]) => {
    context('With ERC/LP token added to the field', () => {
        beforeEach(async () => {
            this.lp = await MockERC20.new('LPToken', 'LP', '10000000000', { from: minter });
            await this.lp.transfer(alice, '1000', { from: minter });
            await this.lp.transfer(bob, '1000', { from: minter });
            await this.lp.transfer(carol, '1000', { from: minter });
            this.lp2 = await MockERC20.new('LPToken2', 'LP2', '10000000000', { from: minter });
            await this.lp2.transfer(alice, '1000', { from: minter });
            await this.lp2.transfer(bob, '1000', { from: minter });
            await this.lp2.transfer(carol, '1000', { from: minter });

            this.getAccTicketPerShare = async (_masterChefIns, _lpTokenIns, _poolId, _multiplier) => {
                let pool = await _masterChefIns.poolInfo(_poolId)
                let lpSupply = await _lpTokenIns.balanceOf(_masterChefIns.address)
                let totalAllocPoint = await _masterChefIns.totalAllocPoint()
                let ticketPerBlock = await _masterChefIns.ticketPerBlock()
                let ticketReward = new BN(_multiplier).mul(ticketPerBlock).mul(pool.allocPoint).div(totalAllocPoint);
                if (lpSupply <= 0) {
                    return new BN('0')
                }
                return pool.accTicketPerShare.add(ticketReward.mul(new BN(1e12)).div(lpSupply))
            }
            this.getPendingReward = async (_masterChefIns, _lpTokenIns, _poolId, _multiplier, _userAccount, _amount) => {
                let user = await _masterChefIns.userLPInfo(_poolId, _userAccount)
                let accTicketPerShare = await this.getAccTicketPerShare(_masterChefIns, _lpTokenIns, _poolId, _multiplier)
                let amount = new BN(_amount)
                let pending = amount.mul(accTicketPerShare).div(new BN(1e12)).sub(user.rewardTicket);
                return pending
            }
        });

        it('should allow emergency withdraw', async () => {
            // 100 per block farming rate starting at block 100 with bonus until block 1000
            this.testmasterChef = await MasterChef.new('0x0000000000000000000000000000000000000000', '100', '0', { from: alice });
            await this.testmasterChef.add('100', this.lp.address, true);
            await expectRevert(
                this.testmasterChef.add('100', this.lp.address, true, { from: bob }),
                'Ownable: caller is not the owner',
            );
            await this.lp.approve(this.testmasterChef.address, '1000', { from: bob });
            await this.testmasterChef.deposit(0, '100', { from: bob });
            assert.equal((await this.lp.balanceOf(bob)).valueOf(), '900');
            await this.testmasterChef.emergencyWithdraw(0, { from: bob });
            assert.equal((await this.lp.balanceOf(bob)).valueOf(), '1000');
        });

        it('should give Tickets only after farming time', async () => {
            // start at block 100.
            this.testmasterChef = await MasterChef.new('0x0000000000000000000000000000000000000000', '100', '100', { from: alice });
            let pid = 0
            await this.testmasterChef.add('100', this.lp.address, true);
            await this.lp.approve(this.testmasterChef.address, '1000', { from: bob });
            await this.testmasterChef.deposit(0, '100', { from: bob });
            await time.advanceBlock();      // block +1
            let reward = await this.getPendingReward(this.testmasterChef, this.lp, pid, 2, bob, 100)
            await this.testmasterChef.deposit(0, '0', { from: bob }); // block 2
            assert.equal((await this.testmasterChef.ticketBalanceOf(bob)).toString(), reward.toString());
            await time.advanceBlock();
            await time.advanceBlock();
            reward = (await this.getPendingReward(this.testmasterChef, this.lp, pid, 3, bob, 100)).add(reward)
            await this.testmasterChef.deposit(0, '0', { from: bob }); // block 3
            assert.equal((await this.testmasterChef.ticketBalanceOf(bob)).toString(), reward.toString());
            await time.advanceBlock();
            await time.advanceBlock();
            await time.advanceBlock();
            reward = (await this.getPendingReward(this.testmasterChef, this.lp, pid, 4, bob, 100)).add(reward)
            await this.testmasterChef.deposit(0, '0', { from: bob }); // block 4
            assert.equal((await this.testmasterChef.ticketBalanceOf(bob)).toString(), reward.toString());
        });

        it('should not distribute Tickets if no one deposit', async () => {
            this.testmasterChef = await MasterChef.new('0x0000000000000000000000000000000000000000', '100', '200', { from: alice });
            let pid = 0
            await this.testmasterChef.add('100', this.lp.address, true);
            await this.lp.approve(this.testmasterChef.address, '1000', { from: bob });
            await time.advanceBlock();
            assert.equal((await this.testmasterChef.ticketBalanceOf(bob)).valueOf(), '0');
            await time.advanceBlock();
            await time.advanceBlock();
            let reward = await this.getPendingReward(this.testmasterChef, this.lp, pid, 4, bob, 0)
            await this.testmasterChef.deposit(0, '10', { from: bob }); // block 4
            assert.equal((await this.testmasterChef.ticketBalanceOf(bob)).toString(), reward.toString());
            assert.equal((await this.lp.balanceOf(bob)).valueOf(), '990');
            await time.advanceBlock();
            reward = (await this.getPendingReward(this.testmasterChef, this.lp, pid, 2, bob, 10)).add(reward)
            await this.testmasterChef.withdraw(0, '10', { from: bob }); // block 2
            assert.equal((await this.testmasterChef.ticketBalanceOf(bob)).toString(), reward.toString());
            assert.equal((await this.lp.balanceOf(bob)).valueOf(), '1000');
            reward = (await this.getPendingReward(this.testmasterChef, this.lp, pid, 1, bob, 0)).add(reward)
            await this.testmasterChef.deposit(0, '0', { from: bob }); // block 1
            assert.equal((await this.testmasterChef.ticketBalanceOf(bob)).toString(), reward.toString());
        });

        it('should distribute Tickets properly for each staker', async () => {
            // 100 per block farming rate starting at block 300 with bonus until block 1000
            this.testmasterChef = await MasterChef.new('0x0000000000000000000000000000000000000000', '100', '300', { from: alice });
            await this.testmasterChef.add('100', this.lp.address, true);
            await this.lp.approve(this.testmasterChef.address, '1000', { from: alice });
            await this.lp.approve(this.testmasterChef.address, '1000', { from: bob });
            await this.lp.approve(this.testmasterChef.address, '1000', { from: carol });
            // Alice deposits 10 LPs
            await time.advanceBlock();
            await this.testmasterChef.deposit(0, '10', { from: alice });
            // Bob deposits 20 LPs
            await time.advanceBlock();
            await time.advanceBlock();
            await this.testmasterChef.deposit(0, '20', { from: bob });          // block 3
            // Carol deposits 30 LPs
            await time.advanceBlock();
            await time.advanceBlock();
            await time.advanceBlock();
            await this.testmasterChef.deposit(0, '30', { from: carol });        // block 4
            // Alice deposits 10 more LPs total block 9.
            // Alice should have: 3*100 + 4*1/3*100 + 2*1/6*100 = 466
            await time.advanceBlock()
            await this.testmasterChef.deposit(0, '10', { from: alice });        // block 2
            assert.equal((await this.testmasterChef.ticketBalanceOf(alice)).toString(), '466');
            assert.equal((await this.testmasterChef.ticketBalanceOf(bob)).valueOf(), '0');
            assert.equal((await this.testmasterChef.ticketBalanceOf(carol)).valueOf(), '0');
            // Bob withdraws 5 LPs total block 9.
            // Bob should have: 4*2/3*100 + 2*2/6*100 + 3*2/7*100 = 419
            await time.advanceBlock()
            await time.advanceBlock()
            await this.testmasterChef.withdraw(0, '5', { from: bob });          // block 3
            assert.equal((await this.testmasterChef.ticketBalanceOf(alice)).valueOf(), '466');
            assert.equal((await this.testmasterChef.ticketBalanceOf(bob)).valueOf(), '419');
            assert.equal((await this.testmasterChef.ticketBalanceOf(carol)).valueOf(), '0');
            // Alice withdraws 20 LPs.
            // Bob withdraws 15 LPs.
            // Carol withdraws 30 LPs.
            await time.advanceBlock()
            await time.advanceBlock()
            await this.testmasterChef.withdraw(0, '20', { from: alice });       // block 3
            await time.advanceBlock()
            await time.advanceBlock()
            await time.advanceBlock()
            await this.testmasterChef.withdraw(0, '15', { from: bob });         // block 4
            await time.advanceBlock()
            await time.advanceBlock()
            await this.testmasterChef.withdraw(0, '30', { from: carol });       // block 3
            // Alice should have: 3*100 + 4*1/3*100 + 2*1/6*100 + 3*2/7*100 + 3*2/6.5*100 = 644
            assert.equal((await this.testmasterChef.ticketBalanceOf(alice)).toString(), '644');
            // Bob should have: 4*2/3*100 + 2*2/6*100 + 3*2/7*100 + 3*1.5/6.5*100 + 4*1.5/4.5*100 = 621
            assert.equal((await this.testmasterChef.ticketBalanceOf(bob)).toString(), '621');
            // Carol should have: 2*3/6*100 + 3*3/7*100 + 3*3/6.5*100 + 4*3/4.5*100 + 3*3/3*100 = 934
            assert.equal((await this.testmasterChef.ticketBalanceOf(carol)).toString(), '934');
            // All of them should have 1000 LPs back.
            assert.equal((await this.lp.balanceOf(alice)).valueOf(), '1000');
            assert.equal((await this.lp.balanceOf(bob)).valueOf(), '1000');
            assert.equal((await this.lp.balanceOf(carol)).valueOf(), '1000');
        });
    });
});