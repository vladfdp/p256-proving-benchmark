//import * as wasm from "p-256-benchmark";
import init, { KeyPair, verify_signature } from '../../pkg/p_256_benchmark';



import circuit from '../../noir_p256/target/noir_p256.json';
import { UltraHonkBackend, UltraPlonkBackend } from '@aztec/bb.js';

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
    
    try {
        await init();

        document.getElementById('result').textContent = `running`;

        const message = "Hello world";  //Maybe add an option to input the message
        const messageBytes = new TextEncoder().encode(message);

        //Check the checkboxes
        const useUltraHonk = document.getElementById('ultrahonk').checked;
        const useUltraPlonk = document.getElementById('ultraplonk').checked;
        const sampleSize = document.getElementById('sampleSize').value;

        const program = circuit;
        const noir = new Noir(program);
        const UHbackend = new UltraHonkBackend(program.bytecode);
        const UPbackend = new UltraPlonkBackend(program.bytecode);

        const N = sampleSize; // Number of iterations

        const results = {
            'UltraHonk': {
                witnessGenerationTimes: [],
                proofGenerationTimes: [], 
                verificationTimes: []
            },
            'UltraPlonk': {
                witnessGenerationTimes: [],
                proofGenerationTimes: [],
                verificationTimes: []
            }
        };

        if (useUltraHonk) {
            let witnessGenerationTimes = [];
            let proofGenerationTimes = [];
            let verificationTimes = [];
            await runBenchmark(UHbackend, noir, N, messageBytes, witnessGenerationTimes, proofGenerationTimes, verificationTimes);
            results['UltraHonk'].witnessGenerationTimes = witnessGenerationTimes;
            results['UltraHonk'].proofGenerationTimes = proofGenerationTimes;
            results['UltraHonk'].verificationTimes = verificationTimes;
        }

        if (useUltraPlonk) {
            let witnessGenerationTimes = [];
            let proofGenerationTimes = [];
            let verificationTimes = [];
            await runBenchmark(UPbackend, noir, N, messageBytes, witnessGenerationTimes, proofGenerationTimes, verificationTimes);
            results['UltraPlonk'].witnessGenerationTimes = witnessGenerationTimes;
            results['UltraPlonk'].proofGenerationTimes = proofGenerationTimes;
            results['UltraPlonk'].verificationTimes = verificationTimes;
        }

        console.log(results);


        let resultText = '';
        if (!useUltraHonk && !useUltraPlonk) {
            resultText = 'No backend selected';
        } else {
            if (useUltraHonk) {
                const uhWitnessAvg = results.UltraHonk.witnessGenerationTimes.reduce((a,b) => a + b, 0) / N;
                const uhProofAvg = results.UltraHonk.proofGenerationTimes.reduce((a,b) => a + b, 0) / N;
                const uhVerifyAvg = results.UltraHonk.verificationTimes.reduce((a,b) => a + b, 0) / N;
                resultText += `UltraHonk - Witness: ${uhWitnessAvg.toFixed(2)}ms, Proof: ${uhProofAvg.toFixed(2)}ms, Verify: ${uhVerifyAvg.toFixed(2)}ms\n`;
            }
            if (useUltraPlonk) {
                const upWitnessAvg = results.UltraPlonk.witnessGenerationTimes.reduce((a,b) => a + b, 0) / N;
                const upProofAvg = results.UltraPlonk.proofGenerationTimes.reduce((a,b) => a + b, 0) / N;
                const upVerifyAvg = results.UltraPlonk.verificationTimes.reduce((a,b) => a + b, 0) / N;
                resultText += `UltraPlonk - Witness: ${upWitnessAvg.toFixed(2)}ms, Proof: ${upProofAvg.toFixed(2)}ms, Verify: ${upVerifyAvg.toFixed(2)}ms`;
            }
        }
        //Update result DOM
        document.getElementById('result').textContent = resultText;
        

        

    } catch (error) {


        console.error("An error occurred:", error);
    }
}

document.getElementById('runButton').addEventListener('click', run);





async function runBenchmark(backend, noir, N, messageBytes, proofGenerationTimes, witnessGenerationTimes, verificationTimes) {
    for (let i = 0; i < N; i++) {


        document.getElementById('result').textContent = `running ${i}/${N}`;
        // Create a keypair
        const keyPair = new KeyPair();
        // Sign the message
        const signatureObj = keyPair.sign(messageBytes);
        const publicKey = keyPair.get_public_key();


        // Convert message hash and signature components to the format needed for the circuit
        const formatted_signature = {
            hashed_message: Array.from(signatureObj.message_hash).map(b => b.toString()),
            pub_key_x: Array.from(publicKey.slice(1, 33)).map(b => b.toString()), // First byte is always 04, so skip it
            pub_key_y: Array.from(publicKey.slice(33, 65)).map(b => b.toString()), // Take last 32 bytes for y
            signature: normalizeSignature([...Array.from(signatureObj.r).map(b => b.toString()), 
                    ...Array.from(signatureObj.s).map(b => b.toString())]) // Normalize concatenated r and s
        };

        // Measure witness generation time
        const witnessStartTime = performance.now();
        const { witness } = await noir.execute(formatted_signature);
        const witnessEndTime = performance.now();
        witnessGenerationTimes.push(witnessEndTime - witnessStartTime);

        // Measure proof generation time
        const proofStartTime = performance.now();
        const proof = await backend.generateProof(witness);
        const proofEndTime = performance.now();
        proofGenerationTimes.push(proofEndTime - proofStartTime);

        // Measure verification time
        const verifyStartTime = performance.now();
        const isProofValid = await backend.verifyProof(proof);
        const verifyEndTime = performance.now();
        verificationTimes.push(verifyEndTime - verifyStartTime);
    }
}





    // If s > halfOrder, compute n - s to get the signature in the normalized form
function normalizeSignature(signature) {

    const r = signature.slice(0, 32);
    const s = signature.slice(32);
    
    const sBigInt = s.reduce((acc, byte) => (acc << 8n) + BigInt(byte), 0n);
    
    // P256 curve order
    const n = 0xFFFFFFFF00000000FFFFFFFFFFFFFFFFBCE6FAADA7179E84F3B9CAC2FC632551n;
    const halfOrder = n >> 1n;
    
    if (sBigInt > halfOrder) {
        let newS = n - sBigInt;
        const normalizedS = new Array(32).fill('0');
        let temp = newS;
        for (let i = 31; i >= 0; i--) {
            normalizedS[i] = (temp & 0xFFn).toString();
            temp >>= 8n;
        }
        
        return [...r.map(String), ...normalizedS];
    }
    
    return signature.map(String);
}

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
  
