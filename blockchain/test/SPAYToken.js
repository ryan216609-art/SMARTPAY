const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SPAYToken", function () {
  async function deployToken() {
    const [owner, user] = await ethers.getSigners();
    const Token = await ethers.getContractFactory("SPAYToken");
    const token = await Token.deploy(owner.address);
    await token.waitForDeployment();
    return { token, owner, user };
  }

  it("cria o fornecimento inicial para o proprietário", async function () {
    const { token, owner } = await deployToken();
    expect(await token.balanceOf(owner.address)).to.equal(
      ethers.parseUnits("100000", 18)
    );
  });

  it("permite transferir tokens", async function () {
    const { token, owner, user } = await deployToken();
    await token.transfer(user.address, ethers.parseUnits("25", 18));
    expect(await token.balanceOf(user.address)).to.equal(
      ethers.parseUnits("25", 18)
    );
  });

  it("impede mint por endereço que não seja proprietário", async function () {
    const { token, user } = await deployToken();
    await expect(
      token.connect(user).mint(user.address, ethers.parseUnits("10", 18))
    ).to.be.reverted;
  });
});
