use wasm_bindgen::prelude::*;
use serde::{Serialize, Deserialize};
use p256::{
    ecdsa::{Signature, SigningKey, VerifyingKey},
    SecretKey,
};
use p256::ecdsa::signature::Signer;
use p256::ecdsa::signature::SignatureEncoding;
use p256::EncodedPoint;
use p256::ecdsa::signature::Verifier;
use rand_core::OsRng;
use sha2::{Sha256, Digest};

#[derive(Serialize)]
struct SignatureComponents {
    r: Vec<u8>,
    s: Vec<u8>,
    message_hash: Vec<u8>,
}


#[wasm_bindgen]
pub struct KeyPair {
    signing_key: SigningKey,
}

#[wasm_bindgen]
impl KeyPair {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        // Generate a random private key
        let secret_key = SecretKey::random(&mut OsRng);
        let signing_key = SigningKey::from(secret_key);
        Self { signing_key }
    }

    // pub fn sign_der(&self, message: &[u8]) -> Vec<u8> {          //Gives signature in der format
    //
    //     let signature: Signature = self.signing_key.sign(message);
    //     signature.to_der().to_vec()
    // }

    pub fn sign(&self, message: &[u8]) -> JsValue {
        // First compute SHA-256 hash explicitly
        let mut hasher = Sha256::new();
        hasher.update(message);
        let sha256_hash = hasher.finalize().to_vec();
        
        let signature: Signature = self.signing_key.sign(message);
        
        let components = SignatureComponents {
            r: signature.r().to_bytes().to_vec(),
            s: signature.s().to_bytes().to_vec(),
            message_hash: sha256_hash,
        };
        
        serde_wasm_bindgen::to_value(&components).unwrap()
    }

    pub fn get_public_key(&self) -> Vec<u8> {
        // Export the public key in SEC1 encoded format
        self.signing_key.verifying_key()
            .to_encoded_point(false) //this gives us the uncompressed format
            .as_bytes()
            .to_vec()
    }

    // pub fn verify_der(&self, message: &[u8], signature: &[u8]) -> bool {
    //     // Verify using this keypair's public key
    //     verify_signature_der(message, signature, &self.get_public_key())
    // }

    pub fn verify(&self, message: &[u8], r: &[u8], s: &[u8]) -> bool {
        let verifying_key = self.signing_key.verifying_key();
        let r_array: [u8; 32] = r.try_into().unwrap_or_default();
        let s_array: [u8; 32] = s.try_into().unwrap_or_default();
    
    Signature::from_scalars(r_array, s_array)
        .map(|sig| verifying_key.verify(message, &sig).is_ok())
        .unwrap_or(false)
    }
}

// #[wasm_bindgen]
// pub fn verify_signature_der(message: &[u8], signature: &[u8], public_key: &[u8]) -> bool {       //Verify function for signatures in der format
//     // Parse the public key
//     let encoded_point = EncodedPoint::from_bytes(public_key).unwrap();
//     let verifying_key = VerifyingKey::from_encoded_point(&encoded_point).unwrap();

//     // Parse the signature from DER format
//     let signature = Signature::from_der(signature).unwrap();

//     // Verify the signature
//     verifying_key.verify(message, &signature).is_ok()
// }


#[wasm_bindgen]
pub fn verify_signature(message: &[u8], r: &[u8], s: &[u8], public_key: &[u8]) -> bool {
    // Parse the public key
    if let Ok(encoded_point) = EncodedPoint::from_bytes(public_key) {
        if let Ok(verifying_key) = VerifyingKey::from_encoded_point(&encoded_point) {
            // Convert r and s to the required format
            let r_array: [u8; 32] = r.try_into().unwrap_or_default();
            let s_array: [u8; 32] = s.try_into().unwrap_or_default();
            
            // Reconstruct the signature from r and s
            if let Ok(signature) = Signature::from_scalars(r_array, s_array) {
                return verifying_key.verify(message, &signature).is_ok();
            }
        }
    }
    false
}
