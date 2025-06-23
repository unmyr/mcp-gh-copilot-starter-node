import { reincarnate } from "../src/tool_reincarnate";

describe("reincarnate", () => {
    it("returns a string containing the name and a reincarnation message", () => {
        const name = "Ann";
        const result = reincarnate(name);
        expect(result).toContain(name);
        expect([
            `${name}, you have been reincarnated as a wise old owl.`,
            `${name}, you have been reincarnated as a brave lion.`,
            `${name}, you have been reincarnated as a cheerful dolphin.`,
            `${name}, you have been reincarnated as a skilled musician.`,
            `${name}, you have been reincarnated as a gentle panda.`
        ]).toContain(result);
    });
});

// Helper to send JSON-RPC messages
function sendMessage(child, msg) {
    child.stdin.write(JSON.stringify(msg) + "\n");
}

// Helper to parse lines from buffer
function parseLines(buffer, onLine) {
    let idx;
    while ((idx = buffer.indexOf('\n')) !== -1 || (idx = buffer.indexOf('\r')) !== -1) {
        const line = buffer.slice(0, idx).trim();
        buffer = buffer.slice(idx + 1);
        if (line) onLine(line);
    }
    return buffer;
}

describe("stdio", () => {
    let child;
    let finished;

    beforeAll(() => {
        const { spawn } = require("child_process");
        finished = false;
        child = spawn('npx', ['ts-node', './src/tool_reincarnate.ts'], { stdio: ['pipe', 'pipe', 'inherit'] });
        child.on('error', (err) => {
            if (!finished) {
                finished = true;
                try { child.kill(); } catch { }
            }
        });
    });

    afterAll(() => {
        if (child) child.kill();
    });

    beforeEach(() => {
        sendMessage(child, {
            jsonrpc: "2.0",
            id: 0,
            method: "initialize",
            params: {
                protocolVersion: "2024-11-05",
                capabilities: {},
                clientInfo: { name: "whatever", version: "0.0.0" }
            }
        });
    });

    it(
        "responds to initialize request over stdio",
        (done) => {
            jest.setTimeout(15000);
            let buffer = "";
            child.stdout.on('data', (data) => {
                buffer += data.toString();
                buffer = parseLines(buffer, (line) => {
                    const json = JSON.parse(line);
                    if (json.id === 0) {
                        expect(json).toMatchObject({
                            result: {
                                protocolVersion: "2024-11-05",
                                capabilities: { tools: { listChanged: true } },
                                serverInfo: { name: "demo-reincarnate-tool", version: "1.0.0" }
                            },
                            jsonrpc: "2.0",
                            id: 0
                        });
                        sendMessage(child, { jsonrpc: "2.0", method: "notifications/initialized", params: {} });
                        sendMessage(child, { jsonrpc: "2.0", id: 1, method: "tools/list", params: {} });
                    } else if (json.id === 1) {
                        expect(json).toMatchObject({
                            result: {
                                tools: [
                                    {
                                        name: "reincarnate",
                                        description: "Reincarnate a person into a new form",
                                        inputSchema: {
                                            type: "object",
                                            properties: {
                                                name: { type: "string", description: "The name of the person to reincarnate" }
                                            },
                                            required: ["name"]
                                        }
                                    }
                                ]
                            },
                            jsonrpc: "2.0",
                            id: 1
                        });
                        sendMessage(child, {
                            jsonrpc: "2.0",
                            id: 2,
                            method: "tools/call",
                            params: {
                                name: "reincarnate",
                                arguments: { name: "Ann" }
                            }
                        });
                    } else if (json.id === 2) {
                        expect(json.result.content[0].text).toContain("Ann");
                        expect(json.jsonrpc).toBe("2.0");
                        expect(json.id).toBe(2);
                        sendMessage(child, { jsonrpc: "2.0", id: 3, method: "server/shutdown", params: [] });
                        child.stdin.end();
                    }
                });
            });
            child.on('close', () => {
                if (!finished) {
                    finished = true;
                    done();
                }
            });
        },
        15000
    );
});
