//import * as wasm from "p-256-benchmark";
import init, { KeyPair, verify_signature } from '../../pkg/p_256_benchmark';


import circuit from '../../noir_p256/target/noir_p256.json';
import { UltraHonkBackend } from '@aztec/bb.js';
import { Noir } from '@noir-lang/noir_js';

import initNoirC from "@noir-lang/noirc_abi";
import initACVM from "@noir-lang/acvm_js";
const acvmPath = new URL('@noir-lang/acvm_js/web/acvm_js_bg.wasm', import.meta.url);
const noircPath = new URL('@noir-lang/noirc_abi/web/noirc_abi_wasm_bg.wasm', import.meta.url);

await Promise.all([
    initACVM(fetch(acvmPath)),
    initNoirC(fetch(noircPath))
]);


async function run() {
    
    await init();

    const message = "Hello world";
    const messageBytes = new TextEncoder().encode(message);
    
    // Create a keypair
    const keyPair = new KeyPair();
    
    // Sign the message
    const signatureObj = keyPair.sign(messageBytes);
    const publicKey = keyPair.get_public_key();
    
    // Verify using the verify method
    // const isValidUsingKeypair = keyPair.verify(messageBytes, signatureObj.r, signatureObj.s);
    // console.log("Verification using keypair:", isValidUsingKeypair);
    
    // Verify using the standalone verify function
    const isValidUsingFunction = verify_signature(messageBytes, signatureObj.r, signatureObj.s, publicKey);
    console.log("Verification using function:", isValidUsingFunction);
    
    // // Log the details
    // console.log({
    //     message,
    //     signatureR: new Uint8Array(signatureObj.r),
    //     signatureS: new Uint8Array(signatureObj.s),
    //     message_hash: new Uint8Array(signatureObj.message_hash),
    //     publicKey: new Uint8Array(publicKey),
    // });


    const program = circuit;
    const noir = new Noir(program);
    const backend = new UltraHonkBackend(program.bytecode);

    const static_signature = {
        hashed_message : ["50", "142", "158", "83", "62", "232", "250", "44", "23", "210", "126", "149", "170", "154", "194", "32", "89", "8", "16", "46", "181", "230", "203", "65", "34", "143", "61", "95", "179", "230", "55", "74"],
        pub_key_x : ["229", "80", "248", "40", "178", "157", "0", "151", "125", "99", "194", "161", "246", "56", "195", "124", "10", "39", "133", "89", "173", "41", "223", "123", "129", "219", "37", "165", "174", "207", "190", "212"],
        pub_key_y : ["146", "144", "173", "73", "138", "38", "167", "200", "101", "70", "250", "153", "248", "62", "71", "11", "79", "236", "221", "195", "215", "118", "228", "154", "102", "191", "190", "38", "135", "254", "243", "137"],
        signature : ["26", "128", "35", "208", "169", "226", "91", "130", "140", "232", "102", "221", "97", "196", "12", "35", "143", "149", "6", "225", "100", "160", "217", "188", "101", "113", "5", "240", "169", "9", "11", "146", "66", "11", "30", "105", "120", "30", "57", "187", "176", "159", "76", "227", "160", "206", "64", "147", "22", "0", "133", "172", "81", "67", "152", "244", "15", "244", "142", "70", "153", "23", "109", "171"]
    };


    console.log(static_signature)

    
    const { witness } = await noir.execute(static_signature);
    






    const proof = await backend.generateProof(witness);
    console.log(proof);

    const isProofValid = await backend.verifyProof(proof);





    // // Get the span element and update its content
    document.getElementById('result').textContent = `it worked?: ${isProofValid}`;
}

document.getElementById('runButton').addEventListener('click', run);



function toHexString(bytes) {
    return Array.from(bytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

function hexToBigInt(hex) {
    return BigInt(hex.startsWith('0x') ? hex : '0x' + hex);     //all hex num should be prefixed by 0x but never hurts to check
}

function byteArrayToBigInt(byteArray) {
    // Convert byte array to BigInt by shifting and combining bytes
    return byteArray.reduce((acc, byte) => (acc << BigInt(8)) + BigInt(byte), BigInt(0));
}

function formatSignatureForCircom(signatureObj, publicKey) {
    // Split the public key into x and y coordinates (remove '04' prefix and split remaining bytes)
    const pubKeyHex = toHexString(new Uint8Array(publicKey));
    const xCoord = pubKeyHex.slice(2, 66);
    const yCoord = pubKeyHex.slice(66);
    
    // Convert to BigInt directly from byte arrays
    const rBig = byteArrayToBigInt(new Uint8Array(signatureObj.r));
    const sBig = byteArrayToBigInt(new Uint8Array(signatureObj.s));
    const hashBig = byteArrayToBigInt(new Uint8Array(signatureObj.message_hash));
    const pub0Big = hexToBigInt(xCoord);  // Keep hex for pubkey since we're already parsing it that way
    const pub1Big = hexToBigInt(yCoord);
    
    // Convert to base 43 chunks
    const rChunks = numberToBase43Chunks(rBig);
    const sChunks = numberToBase43Chunks(sBig);
    const hashChunks = numberToBase43Chunks(hashBig);
    const pub0Chunks = numberToBase43Chunks(pub0Big);
    const pub1Chunks = numberToBase43Chunks(pub1Big);
    
    return {
        r: rChunks.map(n => n.toString()),
        s: sChunks.map(n => n.toString()),
        hash: hashChunks.map(n => n.toString()),
        pub0: pub0Chunks.map(n => n.toString()),
        pub1: pub1Chunks.map(n => n.toString())
    };
}


function numberToBase43Chunks(num, numChunks = 6) {
    const base = BigInt(2 ** 43);
    let remaining = BigInt(num);
    const chunks = [];
    
    for (let i = 0; i < numChunks; i++) {
        chunks.push(remaining % base);
        remaining = remaining / base;
    }
    
    return chunks;
}







    // Utility function for benchmarking
export const benchmark = async (name, iterations, fn) => {
    // Warm up phase
    for (let i = 0; i < 5; i++) await fn();
    
    // Actual measurements
    const times = [];
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await fn();
      const end = performance.now();
      times.push(end - start);
    }
  
    // Calculate statistics
    const avg = times.reduce((a, b) => a + b) / times.length;
    // const min = Math.min(...times);
    // const max = Math.max(...times);
    
    return avg.toFixed(3) + "ms";
  };
  
