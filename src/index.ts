#!/usr/bin/env node

import open from 'open';
import http from 'node:http';

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
    Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { promises as fs } from "fs";
import { join, resolve } from "path";
import { config } from "dotenv";
import { Session, AuthorizationRequestState, SessionTokenSet } from "@inrupt/solid-client-authn-node";
import {
    getSolidDataset,
    getThing,
    getUrl,
    getStringNoLocale,
} from "@inrupt/solid-client";

// Load environment variables
config({ path: '.env.local' });

// Define tool schemas
const ReadFileArgsSchema = z.object({
    // No parameters needed - we'll get the WebID from the authenticated session
    x: z.string().describe("Read solid resource"),
});

const WriteFileArgsSchema = z.object({
    path: z.string().describe("Path to the file to write"),
    content: z.string().describe("Content to write to the file"),
});

const ListDirectoryArgsSchema = z.object({
    path: z.string().describe("Path to the directory to list"),
});

const CalculateArgsSchema = z.object({
    expression: z.string().describe("Mathematical expression to evaluate (e.g., '2 + 2 * 3')"),
});

export class SolidMCPServer {
    private server: Server;
    protected session: Session;
    private sigintHandler: (() => Promise<void>) | null = null;

    constructor() {
        console.error("SOLID MCP SERVER CONSTRUCTOR");
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

        // Store the handler so we can remove it later
        this.sigintHandler = async () => {
            await this.server.close();
            process.exit(0);
        };

        process.on("SIGINT", this.sigintHandler);
    }

    protected cleanup(): void {
        // Remove SIGINT handler to allow process to exit cleanly
        if (this.sigintHandler) {
            process.off("SIGINT", this.sigintHandler);
            this.sigintHandler = null;
        }
    }

    protected setupToolHandlers(): void {


        console.error("SETUP TOOL HANDLERS")
        // List available tools
        this.server.setRequestHandler(ListToolsRequestSchema, async () => {
            return {
                tools: [
                    {
                        name: "readsolid",
                        description: "Read a solid resource",
                        inputSchema: {
                            type: "object",
                            properties: {
                                x: {
                                    type: "string",
                                    description: "The request URI",
                                },
                            },
                            required: ["x"],
                        },
                    },
                    {
                        name: "calculate",
                        description: "Perform mathematical calculations",
                        inputSchema: {
                            type: "object",
                            properties: {
                                expression: {
                                    type: "string",
                                    description: "Mathematical expression to evaluate (e.g., '2 + 2 * 3')",
                                },
                            },
                            required: ["expression"],
                        },
                    },
                ] satisfies Tool[],
            };
        });

        // Handle tool calls
        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            console.error("SET REQUEST HANDLER")
            const { name, arguments: args } = request.params;

            try {
                switch (name) {
                    case "readsolid": {
                        const { x } = ReadFileArgsSchema.parse(args);

                        // Authenticate with Solid if not already authenticated
                        if (!this.session.info.isLoggedIn) {
                            console.error("SOLID NOT AUTHENTICATED")
                            
                            return {
                            content: [
                                    {
                                        type: "text",
                                        text: "not authenticated",
                                    },
                                ],
                            };
                        }
                        else {
                            console.error("SOLID AUTHENTICATED")
                            const response = await this.session.fetch(x)
                            const xx = await response.text();
                            return {
                            content: [
                                    {
                                        type: "text",
                                        text: xx,
                                    },
                                ],
                            };
                        }
                    }

                    case "calculate": {
                        console.error("CALCULATE")
                        const { expression } = CalculateArgsSchema.parse(args);
                        // Simple and safe mathematical expression evaluation
                        // Only allow basic arithmetic operations
                        const sanitized = expression.replace(/[^0-9+\-*/.() ]/g, "");
                        if (sanitized !== expression) {
                            console.error("Invalid characters in expression. Only numbers and +, -, *, /, (, ) are allowed")
                            throw new Error("Invalid characters in expression. Only numbers and +, -, *, /, (, ) are allowed.");
                        }

                        try {
                            // Use Function constructor for safer evaluation than eval
                            const result = new Function(`"use strict"; return (${sanitized})`)();
                            return {
                                content: [
                                    {
                                        type: "text",
                                        text: `${expression} = ${result}`,
                                    },
                                ],
                            };
                        } catch (error) {
                            console.error("CALCULATE Failed to evaluate expression")
                            throw new Error(`Failed to evaluate expression: ${error instanceof Error ? error.message : String(error)}`);
                        }
                    }

                    default:
                        console.error("UNKNOWN TOOL")
                        throw new Error(`Unknown tool: ${name}`);
                }
            } catch (error) {
                console.error("CATCH ERROR")
                const errorMessage = error instanceof Error ? error.message : String(error);
                return {
                    content: [
                        {
                            type: "text",
                            text: `Error: ${errorMessage}`,
                        },
                    ],
                    isError: true,
                };
            }
        });
    }


    async run(): Promise<void> {
        console.error("SOLID MCP SERVER RUN");
        let tokens: SessionTokenSet;

        const server = http.createServer(async (req, res) => {
            console.error("SOLID MCP SERVER CREATE SERVER");
            if (req.url?.includes("callback")) {
                this.session.events.on("newTokens", (tokenSet) => {
                    tokens = tokenSet;
                });

                const x = await this.session.handleIncomingRedirect(`http://localhost:2233${req.url}`);


                const response = await this.session.fetch("https://storage.inrupt.com/47029fdd-c73d-4f53-9a36-66533a892245/");
                const text = await response.text();

                res.write("<html><body><button onclick='window.close()'>close this window</button></body></html>");
                res.end();

                server.close();
                //setImmediate(function(){server.emit('close')});
            }

            if (req.url?.includes("start")) {
                this.session = new Session({  keepAlive: false })

                await this.session.login({
                    redirectUrl: `http://localhost:2233/callback`,
                    oidcIssuer: "https://login.inrupt.com",
                    handleRedirect: (redirectUri) => {
                        res.statusCode = 302;
                        res.setHeader("Location", redirectUri);
                        res.end();
                    },
                });
            }
        }).listen(2233);

        await open('http://localhost:2233/start', { wait: true });

        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        console.error("Solid MCP Server running on stdio");
    }
}

console.error("NEW SOLID MCP SERVER");
// Start the server
const server = new SolidMCPServer();
server.run().catch((error) => {
    console.error("Failed to start server:", error);
    process.exit(1);
});
