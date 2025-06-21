import { reincarnate } from "../src/tool_reincarnate";

describe("reincarnate", () => {
    it("returns a string containing the name and a reincarnation message", () => {
        const name = "Ann";
        const result = reincarnate(name);
        expect(result).toContain(name);
        expect(
            [
                `${name}, you have been reincarnated as a wise old owl.`,
                `${name}, you have been reincarnated as a brave lion.`,
                `${name}, you have been reincarnated as a cheerful dolphin.`,
                `${name}, you have been reincarnated as a skilled musician.`,
                `${name}, you have been reincarnated as a gentle panda.`
            ]
        ).toContain(result);
    });
});

describe("stdio", () => {
    let child;
    let step;
    let finished;

    beforeAll(() => {
        const { spawn } = require("child_process");
        step = 0;
        finished = false;
        child = spawn('npx', ['ts-node', './src/tool_reincarnate.ts'], { stdio: ['pipe', 'pipe', 'inherit'] });
        child.on('error', (err: any) => {
            if (!finished) {
                finished = true;
                try { child.kill(); } catch { }
                // done(err);
            }
        });
    });

    afterAll(() => {
        // Ensure the child process is terminated after each test
        if (child) {
            child.kill();
        }
    });

    beforeEach(() => {
        // Send the initialize request to the child process
        child.stdin.write(JSON.stringify({
            jsonrpc: "2.0",
            id: 0,
            method: "initialize",
            params: {
                protocolVersion: "2024-11-05",
                capabilities: {},
                clientInfo: { name: "whatever", version: "0.0.0" }
            }
        }) + "\r\n");
    });

    it(
        "responds to initialize request over stdio",
        (done) => {
            jest.setTimeout(15000);

            let buffer = "";
            child.stdout.on('data', (data: Buffer) => {
                buffer += data.toString();
                let idx;
                while ((idx = buffer.indexOf('\n')) !== -1 || (idx = buffer.indexOf('\r')) !== -1) {
                    const line = buffer.slice(0, idx).trim();
                    buffer = buffer.slice(idx + 1);
                    if (!line) continue;
                    const json = JSON.parse(line);

                    if (step === 0) {
                        // Received initialize response
                        console.log("Received initialize response: step0: ", json);
                        expect(json).toMatchObject({
                            result: {
                                protocolVersion: "2024-11-05",
                                capabilities: { tools: { listChanged: true } },
                                serverInfo: { name: "demo-reincarnate-tool", version: "1.0.0" }
                            },
                            jsonrpc: "2.0",
                            id: 0
                        });

                        // Send notifications/initialized response
                        child.stdin.write(JSON.stringify({
                            jsonrpc: "2.0",
                            method: "notifications/initialized",
                            params: {}
                        }) + "\r\n");

                        // Send tools/list request
                        child.stdin.write(JSON.stringify({
                            jsonrpc: "2.0",
                            id: 1,
                            method: "tools/list",
                            params: {}
                        }) + "\r\n");
                        step++;
                    } else if (step === 1) {
                        // Received tools/list response
                        console.log("Received tools/list response: step1: ", json);
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

                        // Send request to call the tool
                        child.stdin.write(JSON.stringify({
                            jsonrpc: "2.0",
                            id: 2,
                            method: "tools/call",
                            params: {
                                name: "reincarnate",
                                arguments: { name: "Ann" }
                            }
                        }) + "\r\n");
                        step++;
                    } else if (step === 2) {
                        // Received tools/call response
                        console.log("Received initialize response: step2: ", json);
                        expect(json.result.content[0].text).toContain("Ann");
                        expect(json.jsonrpc).toBe("2.0");
                        expect(json.id).toBe(2);

                        // Send shutdown request
                        child.stdin.write(JSON.stringify({
                            jsonrpc: "2.0",
                            id: 3,
                            method: "server/shutdown",
                            params: []
                        }) + "\r\n");

                        // End the stdin stream to signal completion
                        child.stdin.end();
                        step++;
                    }
                }
            });

            child.on('close', (_code: number) => {
                if (!finished) {
                    finished = true;
                    done();
                }
            });
        },
        15000 // Jest test timeout
    );
});
