const { ethers } = require("ethers");

const errorSignature = "UnauthorizedRelayer()";
const hash = ethers.id(errorSignature).slice(0, 10);
console.log(`${errorSignature}: ${hash}`);

const errorSignature2 = "PaymentAlreadyProcessed()";
const hash2 = ethers.id(errorSignature2).slice(0, 10);
console.log(`${errorSignature2}: ${hash2}`);

const errorSignature3 = "InvalidAmount()";
const hash3 = ethers.id(errorSignature3).slice(0, 10);
console.log(`${errorSignature3}: ${hash3}`);

const errorSignature4 = "SlippageExceeded()";
const hash4 = ethers.id(errorSignature4).slice(0, 10);
console.log(`${errorSignature4}: ${hash4}`);

const errorSignature5 = "SwapFailed()";
const hash5 = ethers.id(errorSignature5).slice(0, 10);
console.log(`${errorSignature5}: ${hash5}`);
