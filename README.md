# p256-proving-benchmark

A benchmark of different proof systems for browser-based proving of ECDSA signatures on the secp256r1 (P256) curve. This repository contains implementations and performance comparisons of various zero-knowledge proving systems. <!--Read more about this project on Hylé's blog: add link when published-->

## Why P256 ECDSA?

P256 (secp256r1) is a NIST standard curve used in:

- Passkeys/WebAuthn signatures
- National identity cards
- Passport signatures
- Digital document signing systems

## Benchmark Results

The following systems were tested on :

- Desktop: Chrome on Macbook M1
- Mobile: Safari on iPhone (16 and Pro), Chrome on Samsung Galaxy A23

| **System** | **Time** | **Status** |
| --- | --- | --- |
| Noir (UltraHonk, multi-thread) - M1 Macbook | 2.06s | Working |
| Noir (UltraHonk, multi-thread) - Android | ~6s | Working |
| Noir (UltraHonk) - iPhone | N/A | Out of memory error |
| Circom | N/A | Too heavy for browser |
| SP1 | N/A | Too heavy for browser |
| Risc0 | N/A | Too heavy for browser |
| Halo2 | N/A | Runtime error |
| Cairo | N/A | Functionality not available |

## How to run

To run the benchmark, you need to have a rust toolchain installed.

Then you can run:

- `npm install` to install the dependencies.
- `npm run wasm` to build the wasm file.
- `npm run dev` to run the dev server.

## Contributing

Contributions are very welcome! We'd love your help with:

- Testing additional proof systems
- Keeping the document up-to-date with new releases for existing systems
- Adding support for alternative proving backends
- Exploring the use of folding schemes

---

## Sponsor

*This project is supported by [Hylé](hyle.eu), the base layer for unchained applications.*
<p align="left">
  <a href="https://hyle.eu" target="_blank"> <img src="https://blog.hyle.eu/content/images/2024/10/Hyl-_widelogo_lightbg.png" width="15%", height="15%"/></a>
</p>
