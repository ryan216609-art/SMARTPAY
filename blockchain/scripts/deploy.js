const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Implantando SPAY com:", deployer.address);

  const Token = await ethers.getContractFactory("SPAYToken");
  const token = await Token.deploy(deployer.address);
  await token.waitForDeployment();

  console.log("SPAYToken implantado em:", await token.getAddress());
  console.log("Rede local de testes. Guarde o endereço para a integração.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
