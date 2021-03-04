const artifacts = require('hardhat').artifacts
const BN = web3.utils.BN;

const SmartWalletSwapImplementation = artifacts.require('SmartWalletSwapImplementation.sol');
const SmartWalletLending = artifacts.require('SmartWalletLending.sol');
const SmartWalletSwapProxy = artifacts.require('SmartWalletSwapProxy.sol');
const BurnGasHelper = artifacts.require('BurnGasHelper.sol');
const GasToken = artifacts.require('IGasToken.sol');
const IERC20Ext = artifacts.require('@kyber.network/utils-sc/contracts/IERC20Ext.sol');

const {ethAddress, zeroAddress, emptyHint} = require('../../test/helper');

let impl;
let implAddr = '0x7617E806f18aE27D617e75baDa80a73238Cf1cC7';
let proxy;
let proxyAddr = '0x4A0C59CcCae7B4F0732a4A1b9A7BDA49cc1d88F9';
let burnGasHelper;
let burnHelperAddr = "0x1ceE38751C1D310ca7Ee11367532044466cB1d43";
let lendingImpl;
let lendingAddr = "0x5f6A27E26dCe05Ed1D4162e52064f308b6177E5d";


let deployer;

const supportedTokens = [
    '0xbca556c912754bc8e7d4aad20ad69a1b1444f42d', // weth
    '0x7b2810576aa1cce68f2b118cef1f36467c648f92', // knc
    '0xad6d458402f60fd3bd25163575031acdce07538d', // dai
    '0xb4f7332ed719eb4839f091eddb2a3ba309739521', // link
    '0x3dff0dce5fc4b367ec91d31de3837cf3840c8284', // wbtc
]

const gst2 = '0x0000000000b3F879cb30FE243b4Dfee438691c04';
const uniswapRouter = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D';
const kyberProxy = '0xd719c34261e099Fdb33030ac8909d5788D3039C4';
const aEth = '0x2433A1b6FcF156956599280C3Eb1863247CFE675';
const aEthV2 = '0x87b1f4cf9bd63f7bbd3ee1ad04e8f52540349347';
const cEth = '0x859e9d8a4edadfEDb5A2fF311243af80F85A91b8';
const compTroller = '0xcfa7b0e37f5AC60f3ae25226F5e39ec59AD26152';
const compTokens = [
  '0xaF50a5A6Af87418DAC1F28F9797CeB3bfB62750A',
  '0x7Ac65E0f6dBA0EcB8845f17d07bF0776842690f8',
  '0x2973e69b20563bcc66dC63Bde153072c33eF37fe',
  '0x6B8b0D7875B4182Fb126877023fB93b934dD302A',
  '0x70014768996439F71C041179Ffddce973a83EEf2',
  '0x65280b21167BBD059221488B7cBE759F9fB18bB5',
  '0xbc689667C13FB2a04f09272753760E38a95B998C',
  '0xF6958Cf3127e62d3EB26c79F4f45d3F3b2CcdeD4',
  '0x2862065D57749f1576F48eF4393eb81c45fC2d88',
  '0x541c9cB0E97b77F142684cc33E8AC9aC17B1990F'
]
const lendingPoolV1 = "0x9E5C7835E4b13368fd628196C4f1c6cEc89673Fa";
const lendingPoolCoreV1 = "0x4295Ee704716950A4dE7438086d6f0FBC0BA9472";

const supportedWallets = [
  '0x3fFFF2F4f6C0831FAC59534694ACd14AC2Ea501b', // android
  '0x9a68f7330A3Fe9869FfAEe4c3cF3E6BBef1189Da', // ios
  '0x440bBd6a888a36DE6e2F6A25f65bc4e16874faa9', // web
]

async function main() {
  const accounts = await web3.eth.getAccounts();
  deployer = accounts[0];
  console.log(`Deployer address at ${deployer}`);

  gasPrice = new BN(2).mul(new BN(10).pow(new BN(9)));
  console.log(`Sending transactions with gas price: ${gasPrice.toString(10)} (${gasPrice.div(new BN(10).pow(new BN(9))).toString(10)} gweis)`);

  if (burnHelperAddr == undefined) {
    burnGasHelper = await BurnGasHelper.new(deployer, gst2);
    burnHelperAddr = burnGasHelper.address;
    console.log(`Deployed burn helper at ${burnHelperAddr}`);
  } else {
    burnGasHelper = await BurnGasHelper.at(burnHelperAddr);
    console.log(`Interacting burn helper at ${burnHelperAddr}`);
  }

  if (implAddr == undefined) {
    impl = await SmartWalletSwapImplementation.new(deployer);
    implAddr = impl.address;
    console.log(`Deployed swap implementation at ${impl.address}`);
  } else {
    impl = await SmartWalletSwapImplementation.at(implAddr);
    console.log(`Interacting swap implementation at ${impl.address}`);
  }

  if (lendingAddr == undefined) {
    lendingImpl = await SmartWalletLending.new(deployer);
    lendingAddr = lendingImpl.address;
    console.log(`Deployed lending implementation at ${lendingAddr}`);
  } else {
    lendingImpl = await SmartWalletLending.at(lendingAddr);
    console.log(`Interacting swap implementation at ${lendingImpl.address}`);
  }

  if (proxyAddr == undefined) {
    proxy = await SmartWalletSwapProxy.new(deployer, impl.address);
    proxyAddr = proxy.address;
    console.log(`Deployed proxy at ${proxy.address}`);
  } else {
    proxy = await SmartWalletSwapProxy.at(proxyAddr);
    console.log(`Interacting proxy at ${proxy.address}`);
    await proxy.updateNewImplementation(impl.address);
    console.log(`Updated implementation: ${impl.address}`)
  }

  let swapProxy = await SmartWalletSwapImplementation.at(proxy.address);
  await swapProxy.updateLendingImplementation(lendingAddr);
  console.log(`Updated lending impl to proxy ${lendingAddr}`);
  await swapProxy.updateBurnGasHelper(burnGasHelper.address);
  console.log(`Updated burn gas helper for proxy`);
  await swapProxy.updateSupportedPlatformWallets(supportedWallets, true, { gasPrice: gasPrice });
  console.log(`Added supported platform wallets`);

  await lendingImpl.updateAaveLendingPoolData(
    zeroAddress,
    lendingPoolV1,
    lendingPoolCoreV1,
    0,
    '0x9E5C7835E4b13368fd628196C4f1c6cEc89673Fa', // fake weth, only use for lending pool v2
    [
      ethAddress,
      "0xf80A32A835F79D7787E8a8ee5721D0fEaFd78108", // dai
      "0x851dEf71f0e6A903375C1e536Bd9ff1684BAD802", // usdc
      "0xCe4aA1dE3091033Ba74FA2Ad951f6adc5E5cF361", // knc
    ]
  );
  console.log(`Updated aave lending pool data to lending impl`);
  await lendingImpl.updateCompoundData(compTroller, cEth, compTokens);
  console.log(`Updated compound data to lending impl`);
  await lendingImpl.updateSwapImplementation(proxy.address);
  console.log(`Updated proxy to lending impl`)

  for(let i = 0; i < supportedTokens.length; i++) {
    let token = await IERC20Ext.at(supportedTokens[i]);
    await token.approve(swapProxy.address, new BN(2).pow(new BN(255)), { gasPrice: gasPrice });
    console.log(`Approved allowances for token: ${supportedTokens[i]}`);
  }

  let gasToken = await GasToken.at(gst2);
  await gasToken.mint(160);
  console.log(`Minted gas`)
  await gasToken.approve(swapProxy.address, new BN(2).pow(new BN(255)));
  console.log(`Approved gas token`)
  let kncAmount = new BN(10).pow(new BN(18));
  let kncToken = await IERC20Ext.at('0x7b2810576aa1cce68f2b118cef1f36467c648f92');
  await kncToken.approve(swapProxy.address, new BN(2).pow(new BN(255)), { gasPrice: gasPrice });
  console.log(`Approved knc`)
  let tx1 = await swapProxy.swapKyberAndDeposit(
    0, // aave v1
    kncToken.address,
    ethAddress,
    kncAmount,
    new BN(0),
    8,
    supportedWallets[0],
    emptyHint,
    true,
    { gas: 3000000 }
  );
  console.log(`Swap Kyber and deposit aave v1 gas used: ${tx1.receipt.gasUsed}`);
  let ethAmount = new BN(10).pow(new BN(16));
  tx1 = await swapProxy.swapKyberAndDeposit(
    1, // aave v2
    ethAddress,
    ethAddress,
    ethAmount,
    new BN(0),
    8,
    supportedWallets[0],
    emptyHint,
    true,
    { value: ethAmount, gas: 3000000 }
  );
  console.log(`Deposit aave v1 gas used: ${tx1.receipt.gasUsed}`);
  let tx3 = await swapProxy.swapKyberAndDeposit(
    2, //compound
    kncToken.address,
    ethAddress,
    kncAmount,
    new BN(0),
    8,
    supportedWallets[0],
    emptyHint,
    true,
    { gas: 3000000 }
  );
  console.log(`Swap Kyber and deposit compound gas used: ${tx3.receipt.gasUsed}`);
  ethAmount = new BN(10).pow(new BN(16));
  tx3 = await swapProxy.swapKyberAndDeposit(
    2, //compound
    ethAddress,
    ethAddress,
    ethAmount,
    new BN(0),
    8,
    supportedWallets[0],
    emptyHint,
    true,
    { value: ethAmount, gas: 3000000 }
  );
  console.log(`Deposit compound gas used: ${tx3.receipt.gasUsed}`);

  let tx4;
  // let aEthToken2 = await IERC20Ext.at(aEthV2);
  // let aEthBalance2 = await aEthToken2.balanceOf(deployer);
  // let aEthAmount2 = aEthBalance2.div(new BN(5));
  // console.log(`aETH balance: ${aEthBalance2.toString(10)}`);
  // await aEthToken2.approve(swapProxy.address, new BN(2).pow(new BN(255)));
  // tx4 = await swapProxy.withdrawFromLendingPlatform(0, ethAddress, aEthAmount2, new BN(0), true, { gas: 2000000 });
  // console.log(`Withdraw eth from aave v2, gas used: ${tx4.receipt.gasUsed}`);

  let aEthToken = await IERC20Ext.at(aEth);
  let aEthBalance = await aEthToken.balanceOf(deployer);
  let aEthAmount = aEthBalance.div(new BN(5));
  console.log(`aETH balance: ${aEthBalance.toString(10)}`);
  await aEthToken.approve(swapProxy.address, new BN(2).pow(new BN(255)));
  tx4 = await swapProxy.withdrawFromLendingPlatform(0, ethAddress, aEthAmount, new BN(0), true, { gas: 2000000 });
  console.log(`Withdraw eth from aave v1, gas used: ${tx4.receipt.gasUsed}`);

  let cEthToken = await IERC20Ext.at(cEth);
  let cEthBalance = await cEthToken.balanceOf(deployer);
  let cEthAmount = cEthBalance.div(new BN(5));
  console.log(`cETH balance: ${cEthBalance.toString(10)}`);
  await cEthToken.approve(swapProxy.address, new BN(2).pow(new BN(255)));
  tx4 = await swapProxy.withdrawFromLendingPlatform(2, ethAddress, cEthAmount, new BN(0), true, { gas: 2000000 });
  console.log(`Withdraw eth from compound, gas used: ${tx4.receipt.gasUsed}`);
}


main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });