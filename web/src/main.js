import init, { KeyPair, verify_signature } from '../../pkg/p256_proving_benchmark';
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

const runButton = document.getElementById('runButton');
const statusElement = document.getElementById('status');
const resultsTable = document.getElementById('resultsTable');
const ramSupportNote = document.getElementById('ramSupport');

// Check if performance.memory is available
const hasMemoryAPI = performance && performance.memory;
if (!hasMemoryAPI) {
    ramSupportNote.classList.remove('hidden');
}

function getMemoryUsage() {
    if (hasMemoryAPI) {
        return performance.memory.usedJSHeapSize / (1024 * 1024); // Convert to MB
    }
    return null;
}

async function run() {
    try {
        await init();

        // Update UI state
        runButton.disabled = true;
        statusElement.classList.remove('hidden');
        resultsTable.classList.add('hidden');

        const message = "Hello world";
        const messageBytes = new TextEncoder().encode(message);

        const useUltraHonk = document.getElementById('ultrahonk').checked;
        const useUltraPlonk = document.getElementById('ultraplonk').checked;
        const sampleSize = parseInt(document.getElementById('sampleSize').value);
        const numThreads = parseInt(document.getElementById('numThreads').value);

        if (!useUltraHonk && !useUltraPlonk) {
            statusElement.textContent = 'Please select at least one backend';
            runButton.disabled = false;
            return;
        }

        const program = circuit;
        const noir = new Noir(program);
        
        if (crossOriginIsolated) {
            console.log('Multithreading is enabled!');
        } else {
            console.warn('Multithreading is not available - check COOP/COEP headers');
        }

        const UHbackend = new UltraHonkBackend(program.bytecode, { threads: numThreads });
        const UPbackend = new UltraPlonkBackend(program.bytecode, { threads: numThreads });

        const results = {
            'UltraHonk': {
                witnessGenerationTimes: [],
                proofGenerationTimes: [], 
                verificationTimes: [],
                peakMemoryUsage: 0
            },
            'UltraPlonk': {
                witnessGenerationTimes: [],
                proofGenerationTimes: [],
                verificationTimes: [],
                peakMemoryUsage: 0
            }
        };

        // Run benchmarks
        if (useUltraHonk) {
            document.getElementById('ultrahonkRow').classList.remove('hidden');
            await runBenchmark(UHbackend, noir, sampleSize, messageBytes, results.UltraHonk);
        }

        if (useUltraPlonk) {
            document.getElementById('ultraplonkRow').classList.remove('hidden');
            await runBenchmark(UPbackend, noir, sampleSize, messageBytes, results.UltraPlonk);
        }

        // Update results table
        if (useUltraHonk) {
            updateResults('uh', results.UltraHonk, sampleSize);
        }
        if (useUltraPlonk) {
            updateResults('up', results.UltraPlonk, sampleSize);
        }

        // Show results
        statusElement.classList.add('hidden');
        resultsTable.classList.remove('hidden');
        runButton.disabled = false;

    } catch (error) {
        console.error("An error occurred:", error);
        statusElement.textContent = 'An error occurred. Check console for details.';
        runButton.disabled = false;
    }
}

function updateResults(prefix, results, sampleSize) {
    const witnessAvg = results.witnessGenerationTimes.reduce((a,b) => a + b, 0) / sampleSize;
    const proofAvg = results.proofGenerationTimes.reduce((a,b) => a + b, 0) / sampleSize;
    const verifyAvg = results.verificationTimes.reduce((a,b) => a + b, 0) / sampleSize;

    document.getElementById(`${prefix}-witness`).textContent = witnessAvg.toFixed(2);
    document.getElementById(`${prefix}-proof`).textContent = proofAvg.toFixed(2);
    document.getElementById(`${prefix}-verify`).textContent = verifyAvg.toFixed(2);
    document.getElementById(`${prefix}-ram`).textContent = hasMemoryAPI 
        ? results.peakMemoryUsage.toFixed(1)
        : 'Unavailable';
}

async function runBenchmark(backend, noir, N, messageBytes, results) {
    // Warm-up phase
    const WARM_UP_ITERATIONS = 1;
    statusElement.textContent = "Warming up...";
    
    for (let i = 0; i < WARM_UP_ITERATIONS; i++) {
        const keyPair = new KeyPair();
        const signatureObj = keyPair.sign(messageBytes);
        const publicKey = keyPair.get_public_key();
        const formatted_signature = formatSignature(signatureObj, publicKey);
        
        const { witness } = await noir.execute(formatted_signature);
        const proof = await backend.generateProof(witness);
        await backend.verifyProof(proof);
    }

    // Actual benchmark
    for (let i = 0; i < N; i++) {
        statusElement.textContent = `Running benchmark ${i + 1}/${N}`;
        
        const keyPair = new KeyPair();
        const signatureObj = keyPair.sign(messageBytes);
        const publicKey = keyPair.get_public_key();
        const formatted_signature = formatSignature(signatureObj, publicKey);

        // Track peak memory throughout the process
        let currentMemory = getMemoryUsage();
        if (currentMemory !== null) {
            results.peakMemoryUsage = Math.max(results.peakMemoryUsage, currentMemory);
        }

        const witnessStartTime = performance.now();
        const { witness } = await noir.execute(formatted_signature);
        const witnessEndTime = performance.now();
        results.witnessGenerationTimes.push(witnessEndTime - witnessStartTime);

        currentMemory = getMemoryUsage();
        if (currentMemory !== null) {
            results.peakMemoryUsage = Math.max(results.peakMemoryUsage, currentMemory);
        }

        const proofStartTime = performance.now();
        const proof = await backend.generateProof(witness);
        const proofEndTime = performance.now();
        results.proofGenerationTimes.push(proofEndTime - proofStartTime);

        currentMemory = getMemoryUsage();
        if (currentMemory !== null) {
            results.peakMemoryUsage = Math.max(results.peakMemoryUsage, currentMemory);
        }

        const verifyStartTime = performance.now();
        await backend.verifyProof(proof);
        const verifyEndTime = performance.now();
        results.verificationTimes.push(verifyEndTime - verifyStartTime);

        currentMemory = getMemoryUsage();
        if (currentMemory !== null) {
            results.peakMemoryUsage = Math.max(results.peakMemoryUsage, currentMemory);
        }
    }
}

// Keep existing helper functions
function formatSignature(signatureObj, publicKey) {
    return {
        hashed_message: Array.from(signatureObj.message_hash).map(b => b.toString()),
        pub_key_x: Array.from(publicKey.slice(1, 33)).map(b => b.toString()),
        pub_key_y: Array.from(publicKey.slice(33, 65)).map(b => b.toString()),
        signature: normalizeSignature([...Array.from(signatureObj.r).map(b => b.toString()),
                ...Array.from(signatureObj.s).map(b => b.toString())])
    };
}

function normalizeSignature(signature) {
    const r = signature.slice(0, 32);
    const s = signature.slice(32);
    
    const sBigInt = s.reduce((acc, byte) => (acc << 8n) + BigInt(byte), 0n);
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

runButton.addEventListener('click', run);