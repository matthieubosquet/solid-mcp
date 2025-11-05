#!/usr/bin/env node

import open from "open";
import http from "node:http";

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
    Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { config } from "dotenv";
import { Session } from "@inrupt/solid-client-authn-node";

config({ path: ".env.local" });

const ReadFileArgsSchema = z.object({
    resourceUri: z.string().describe("The URI (address) of the Solid resource"),
});

export class SolidMCPServer {
    private server: Server;
    protected session: Session;
    private sigintHandler: (() => Promise<void>) | null = null;

    constructor() {
        this.session = new Session();
        this.server = new Server(
            {
                name: "solid-mcp",
                version: "1.0.0",
            },
            {
                capabilities: {
                    tools: {},
                },
            }
        );

        this.setupToolHandlers();
        this.setupErrorHandling();
    }

    protected setupErrorHandling(): void {
        this.server.onerror = (error) => {
            console.error("[MCP Error]", error);
        };

        this.sigintHandler = async () => {
            await this.server.close();
            process.exit(0);
        };

        process.on("SIGINT", this.sigintHandler);
    }

    protected cleanup(): void {
        if (this.sigintHandler) {
            process.off("SIGINT", this.sigintHandler);
            this.sigintHandler = null;
        }
    }

    protected setupToolHandlers(): void {
        this.server.setRequestHandler(ListToolsRequestSchema, async () => {
            return {
                tools: [
                    {
                        name: "readsolid",
                        description: "Read a solid resource",
                        inputSchema: {
                            type: "object",
                            properties: {
                                resourceUri: {
                                    type: "string",
                                    description:
                                        "The URI (address) of the Solid resource",
                                },
                            },
                            required: ["resourceUri"],
                        },
                    },
                ] satisfies Tool[],
            };
        });

        this.server.setRequestHandler(
            CallToolRequestSchema,
            async (request) => {
                const { name, arguments: args } = request.params;

                switch (name) {
                    case "readsolid": {
                        const { resourceUri } = ReadFileArgsSchema.parse(args);

                        if (!this.session.info.isLoggedIn) {
                            return {
                                content: [
                                    {
                                        type: "text",
                                        text: "not authenticated",
                                    },
                                ],
                            };
                        } else {
                            const response =
                                await this.session.fetch(resourceUri);
                            return {
                                content: [
                                    {
                                        type: "text",
                                        text: await response.text(),
                                    },
                                ],
                            };
                        }
                    }

                    default:
                        throw new Error(`Unknown tool: ${name}`);
                }
            }
        );
    }

    async run(): Promise<void> {
        const server = http
            .createServer(async (req, res) => {
                if (req.url?.includes("callback")) {
                    await this.session.handleIncomingRedirect(
                        `http://localhost:2233${req.url}`
                    );

                    res.write("<html><body>close this window</body></html>");
                    res.end();

                    server.close();
                }

                if (req.url?.includes("start")) {
                    this.session = new Session({ keepAlive: false });

                    await this.session.login({
                        redirectUrl: "http://localhost:2233/callback",
                        oidcIssuer: "https://login.inrupt.com",
                        handleRedirect: (redirectUri) => {
                            res.statusCode = 302;
                            res.setHeader("Location", redirectUri);
                            res.end();
                        },
                    });
                }
            })
            .listen(2233);

        await open("http://localhost:2233/start", { wait: true });

        const transport = new StdioServerTransport();
        await this.server.connect(transport);
    }
}

const server = new SolidMCPServer();
server.run().catch(() => process.exit(1));
