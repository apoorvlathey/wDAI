require("@openzeppelin/test-helpers/configure");
const { expect } = require("chai");
const {
  expectRevert,
  expectEvent,
  ether
} = require("@openzeppelin/test-helpers");
const helper = require("ganache-time-traveler");

const DAI = artifacts.require("DAI")
const wDAI = artifacts.require("wDAI")

contract("wDAI", accounts => {
  const owner = accounts[0]
  const user1 = accounts[1]
  const user2 = accounts[2]

  describe('wDAI', () => {
    before(async () => {
      this.DAI = await DAI.new({from: owner})
      this.wDAI = await wDAI.new(this.DAI.address)

      await this.DAI.transfer(user1, ether("100"))
      await this.DAI.transfer(user2, ether("100"))
    })

    beforeEach(async () => {
      let snapShot = await helper.takeSnapshot();
      snapshotId = snapShot["result"];
    });

    afterEach(async () => {
      await helper.revertToSnapshot(snapshotId);
    });

    it("should mint wDAI", async() => {
      const iniDAIBal = await this.DAI.balanceOf(user1)
      const iniWDAIBal = await this.wDAI.balanceOf(user1)

      await this.DAI.approve(this.wDAI.address, ether("10"), {
        from: user1
      })

      const {logs} = await this.wDAI.deposit(ether("10"), {
        from: user1
      })

      const finalDAIBal = await this.DAI.balanceOf(user1)
      const finalWDAIBal = await this.wDAI.balanceOf(user1)

      expectEvent.inLogs(logs, "mint", {
        user: user1,
        amount: ether("10")
      })
      expect(finalDAIBal).to.be.bignumber.lt(iniDAIBal)
      expect(finalWDAIBal).to.be.bignumber.gt(iniWDAIBal)
    })

    describe('After Liquidity Added:', () => {
      beforeEach(async () => {
        await this.DAI.approve(this.wDAI.address, ether("10"), {
          from: user1
        })
        await this.wDAI.deposit(ether("10"), {
          from: user1
        })    
      })

      it("should burn wDAI", async () => {
        const iniDAIBal = await this.DAI.balanceOf(user1)
        const iniWDAIBal = await this.wDAI.balanceOf(user1)

        const {logs} = await this.wDAI.withdraw(ether("10"), {
          from: user1
        })

        const finalDAIBal = await this.DAI.balanceOf(user1)
        const finalWDAIBal = await this.wDAI.balanceOf(user1)

        expectEvent.inLogs(logs, "burn", {
          user: user1,
          amount: ether("10")
        })
        expect(finalWDAIBal).to.be.bignumber.lt(iniWDAIBal)
        expect(finalDAIBal).to.be.bignumber.gt(iniDAIBal)
      })

      it("should allow Owner to Transfer Liquidity", async () => {
        const iniDAIBal = await this.DAI.balanceOf(this.wDAI.address)
        const iniU2DAIBal = await this.DAI.balanceOf(user2)

        await this.wDAI.ownerTransfer(ether("5"), user2, {
          from: owner
        })

        const finalDAIBal = await this.DAI.balanceOf(this.wDAI.address)
        const finalU2DAIBal = await this.DAI.balanceOf(user2)

        expect(finalDAIBal).to.be.bignumber.lt(iniDAIBal)
        expect(finalU2DAIBal).to.be.bignumber.gt(iniU2DAIBal)
      })

      it("should revert if ownerTransfer not called by owner", async () => {
        await expectRevert(
          this.wDAI.ownerTransfer(ether("5"), user2, {
            from: user1
          }),
          "Ownable: caller is not the owner"
        )
      })
    
      it("should revert if low liquidity present when withdrawing", async () => {
        const DAILiquidity = await this.DAI.balanceOf(this.wDAI.address)
        await this.wDAI.ownerTransfer(DAILiquidity, user2, {
          from: owner
        })

        await expectRevert(
          this.wDAI.withdraw(ether("10"), {
            from: user1
          }),
          "Err: Low Liquidity"
        )
      })
    });
  })
})