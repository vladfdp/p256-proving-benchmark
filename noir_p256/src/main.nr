fn main(
    hashed_message : pub [u8;32], 
    pub_key_x : pub [u8;32], 
    pub_key_y : pub [u8;32], 
    signature : pub [u8;64]
) {
    let valid_signature = std::ecdsa_secp256r1::verify_signature(pub_key_x, pub_key_y, signature, hashed_message);
    assert(valid_signature);
}