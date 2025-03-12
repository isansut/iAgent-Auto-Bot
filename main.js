const fs = require("fs");
const axios = require("axios");
const { ethers } = require("ethers");
const FormData = require("form-data");

const REFERRAL_FILE = "reff.txt";
const WALLET_FILE = "wallets.txt";
let referralCodes = fs.existsSync(REFERRAL_FILE) ? fs.readFileSync(REFERRAL_FILE, "utf8").split("\n").map(code => code.trim()) : [];

const wallet = ethers.Wallet.createRandom();
const privateKey = wallet.privateKey;
const address = wallet.address;
const seedPhrase = wallet.mnemonic.phrase;

console.log("🔑 Private Key:", privateKey);
console.log("🏠 Address:", address);
console.log("🌱 Seed Phrase:", seedPhrase);

fs.appendFileSync(WALLET_FILE, `${address} | ${privateKey} | ${seedPhrase}\n`, "utf8");

const message = `Welcome to AGNTxp! Click "Sign" to log in and verify ownership of your wallet address.`;

async function registerAccount() {
    try {
        const signature = await wallet.signMessage(message);
        console.log("✍️ Signature:", signature);

        const response = await axios.post("https://iagent-xp.iagentpro.com/register", {
            walletAddress: address,
            signature: signature
        });

        if (response.data.token) {
    console.log("✅ Berhasil daftar!");
    console.log("🔑 Token: ", response.data.token); 
    return response.data.token;
}

    } catch (error) {
        console.error("❌ Error daftar:", error.response?.data || error.message);
    }
    return null;
}

async function submitReferral(token) {
    for (const code of referralCodes) {
        try {
            const response = await axios.post("https://iagent-xp.iagentpro.com/validate-referal", { referralCode: code }, { headers: { Authorization: `Bearer ${token}` } });
            console.log(`✅ Referral ${code} berhasil diklaim!`, response.data);
        } catch (error) {
            console.error(`❌ Gagal klaim referral ${code}:`, error.response?.data || error.message);
        }
    }
}

async function uploadProfile(token) {
    try {
        const imagePath = "avatar.png";
        if (!fs.existsSync(imagePath)) {
            console.log("⚠️ Gambar avatar.png tidak ditemukan! Lewati upload profile.");
            return null;
        }

        const formData = new FormData();
        formData.append("profilePicture", fs.createReadStream(imagePath));

        const response = await axios.post("https://iagent-xp.iagentpro.com/agent-identity/upload", formData, {
            headers: { Authorization: `Bearer ${token}`, ...formData.getHeaders() }
        });

        console.log("📤 Response Upload Profile:", response.data); 

        if (response.data && response.data.data && response.data.data.profile_picture_url) {
            console.log("✅ Profil berhasil di-upload! URL:", response.data.data.profile_picture_url);
            return response.data.data.profile_picture_url;
        } else {
            console.log("❌ Tidak menemukan URL gambar dalam response!");
        }
    } catch (error) {
        console.error("❌ Gagal upload profil:", error.response?.data || error.message);
    }
    return null;
}


async function generateIdentity(token) {
    try {
        const response = await axios.post("https://iagent-xp.iagentpro.com/agent-identity/generate", {}, { headers: { Authorization: `Bearer ${token}` } });
        console.log("✅ Identitas berhasil dibuat!", response.data);
    } catch (error) {
        console.error("❌ Gagal generate identitas:", error.response?.data || error.message);
    }
}

async function checkIdentityReady(token) {
    console.log("⏳ Menunggu 10 detik sebelum cek status identitas...");
    await new Promise(resolve => setTimeout(resolve, 10000));

    for (let i = 0; i < 15; i++) {
        try {
            const response = await axios.get("https://iagent-xp.iagentpro.com/agent-identity/profile", { headers: { Authorization: `Bearer ${token}` } });
            if (response.data?.data?.profile_picture) {
    console.log("✅ Identitas siap untuk dibagikan!");
    console.log("📸 Profile Picture:", response.data.data.profile_picture);
    console.log("🆔 Agent Profile Picture:", response.data.data.agent_profile_picture);
    return response.data.data.profile_picture;
}

        } catch (error) {
            console.error("❌ Gagal cek status identitas:", error.response?.data || error.message);
        }
        console.log(`⏳ Identitas belum siap, cek lagi... (${i + 1}/15)`);
        await new Promise(resolve => setTimeout(resolve, 5000));
    }
    return null;
}

async function shareIdentity(token) {
    if (await checkIdentityReady(token)) {
        try {
            const response = await axios.post("https://iagent-xp.iagentpro.com/agent-identity/share", {}, { headers: { Authorization: `Bearer ${token}` } });
            console.log("✅ Identitas berhasil dibagikan!", response.data);
        } catch (error) {
            console.error("❌ Gagal share identitas:", error.response?.data || error.message);
        }
    } else {
        console.log("❌ Gagal share identitas: Identitas belum siap.");
    }
}

async function checkUserInfo(token) {
    try {
        const response = await axios.get("https://iagent-xp.iagentpro.com/get-user-info", {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log("📊 User Info:", response.data);
    } catch (error) {
        console.error("❌ Gagal cek user info:", error.response?.data || error.message);
    }
}

(async () => {
    const token = await registerAccount();
    if (token) {
        await submitReferral(token);
        await uploadProfile(token);
        await generateIdentity(token);
        await shareIdentity(token);
        await checkUserInfo(token); 
    }
})();
