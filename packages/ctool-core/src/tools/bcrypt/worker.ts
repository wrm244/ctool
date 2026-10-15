import bcrypt from "bcryptjs";

// Helper function to send messages back to the main thread
const post = (method: string, data: any) => {
    let send = { method, data };
    console.log("worker send", send);
    self.postMessage({ method, data });
};

// Function to simulate different bcrypt versions in hashing
const hash = ({ input, rounds, version }: { input: string, rounds: number, version: string }) => {
    // Generate the salt
    let salt = bcrypt.genSaltSync(rounds);

    // bcryptjs 3.x 固定生成 $2b$ 前缀，按用户选择的版本改写前缀即可
    if (version !== "2b") {
        salt = salt.replace(/^\$2[aby]\$/, `$${version}$`);
    }

    // Hash the input with the modified salt
    bcrypt.hash(input, salt, (err, hash) => post("hash", { err, hash, version }));
};

// Function to compare input with hash
const compare = ({ input, hash }: { input: string, hash: string }) => {
    bcrypt.compare(input, hash, (err, res) => post("compare", { err, res }));
};

// Event listener to handle incoming messages
self.addEventListener("message", function(e) {
    console.log("worker accept", e.data);
    const data = e.data;
    if (data.method === "hash") {
        return hash(data.data);
    }
    if (data.method === "compare") {
        return compare(data.data);
    }
}, false);
