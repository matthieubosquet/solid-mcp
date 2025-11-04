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
import { Session } from "@inrupt/solid-client-authn-node";
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

    protected async authenticateWithSolid(): Promise<void> {
        const clientId = process.env.SOLID_CLIENT_ID;
        const clientSecret = process.env.SOLID_CLIENT_SECRET;
        const oidcIssuer = process.env.SOLID_OIDC_ISSUER || "https://login.inrupt.com/";

        if (!clientId || !clientSecret) {
            throw new Error("Missing SOLID_CLIENT_ID or SOLID_CLIENT_SECRET environment variables");
        }

        try {
            await this.session.login({
                clientId,
                clientSecret,
                oidcIssuer,
            });

            if (this.session.info.isLoggedIn) {
                console.error(`Successfully authenticated with Solid Pod. WebID: ${this.session.info.webId}`);
            } else {
                throw new Error("Authentication failed - session is not logged in");
            }
        } catch (error) {
            console.error("Failed to authenticate with Solid Pod:", error);
            throw error;
        }
    }

    protected async fetchWebIdProfile(webId: string): Promise<string> {
        try {
            // Fetch the WebID profile document
            const profileDataset = await getSolidDataset(webId, {
                fetch: this.session.fetch,
            });

            // Get the profile thing (the WebID itself)
            const profile = getThing(profileDataset, webId);

            if (!profile) {
                throw new Error(`No profile found at WebID: ${webId}`);
            }

            // Extract profile information using common RDF vocabularies
            const name = getStringNoLocale(profile, "http://xmlns.com/foaf/0.1/name") ||
                getStringNoLocale(profile, "http://www.w3.org/2006/vcard/ns#fn") ||
                "Name not available";

            const email = getStringNoLocale(profile, "http://xmlns.com/foaf/0.1/mbox") ||
                getStringNoLocale(profile, "http://www.w3.org/2006/vcard/ns#hasEmail") ||
                "Email not available";

            const homepage = getUrl(profile, "http://xmlns.com/foaf/0.1/homepage") || "Homepage not available";

            // Get friends/connections count
            const knowsPredicate = profile.predicates["http://xmlns.com/foaf/0.1/knows"];
            const friendsCount = knowsPredicate ? (knowsPredicate.namedNodes?.length || 0) : 0;

            // Format the profile information
            const profileInfo = `
🔐 Solid Authentication & WebID Profile
======================================

✅ Authentication Status: Successfully authenticated with Solid Pod
🆔 WebID Retrieved from Session: ${webId}

📋 Profile Information:
----------------------
Name: ${name}
Email: ${email}
Homepage: ${homepage}
Friends/Connections: ${friendsCount}

🔗 Session Details:
------------------
Logged In: ${this.session.info.isLoggedIn ? 'Yes' : 'No'}
Session WebID: ${this.session.info.webId || 'Not available'}
OIDC Issuer: ${process.env.SOLID_OIDC_ISSUER || 'https://login.inrupt.com/'}
`;

            return profileInfo;
        } catch (error) {
            throw new Error(`Failed to fetch WebID profile: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    protected setupToolHandlers(): void {


        // List available tools
        this.server.setRequestHandler(ListToolsRequestSchema, async () => {
            return {
                tools: [
                    {
                        name: "read_file",
                        description: "Authenticate with Solid Pod and retrieve your WebID profile information",
                        inputSchema: {
                            type: "object",
                            properties: {},
                            required: [],
                        },
                    },
                    {
                        name: "write_file",
                        description: "Write content to a file",
                        inputSchema: {
                            type: "object",
                            properties: {
                                path: {
                                    type: "string",
                                    description: "Path to the file to write",
                                },
                                content: {
                                    type: "string",
                                    description: "Content to write to the file",
                                },
                            },
                            required: ["path", "content"],
                        },
                    },
                    {
                        name: "list_directory",
                        description: "List the contents of a directory",
                        inputSchema: {
                            type: "object",
                            properties: {
                                path: {
                                    type: "string",
                                    description: "Path to the directory to list",
                                },
                            },
                            required: ["path"],
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
            const { name, arguments: args } = request.params;

            try {
                switch (name) {
                    case "read_file": {
                        ReadFileArgsSchema.parse(args);

                        // Authenticate with Solid if not already authenticated
                        if (!this.session.info.isLoggedIn) {
                            await this.authenticateWithSolid();
                        }

                        // Get the WebID from the authenticated session
                        const webId = this.session.info.webId;
                        if (!webId) {
                            throw new Error("No WebID found in authenticated session");
                        }

                        // Fetch the WebID profile using the session's WebID
                        const profileInfo = await this.fetchWebIdProfile(webId);

                        return {
                            content: [
                                {
                                    type: "text",
                                    text: profileInfo,
                                },
                            ],
                        };
                    }

                    case "write_file": {
                        const { path, content } = WriteFileArgsSchema.parse(args);
                        const resolvedPath = resolve(path);
                        await fs.writeFile(resolvedPath, content, "utf-8");
                        return {
                            content: [
                                {
                                    type: "text",
                                    text: `Successfully wrote to ${path}`,
                                },
                            ],
                        };
                    }

                    case "list_directory": {
                        const { path } = ListDirectoryArgsSchema.parse(args);
                        const resolvedPath = resolve(path);
                        const entries = await fs.readdir(resolvedPath, { withFileTypes: true });
                        const formatted = entries
                            .map((entry) => {
                                const type = entry.isDirectory() ? "📁" : "📄";
                                return `${type} ${entry.name}`;
                            })
                            .join("\n");

                        return {
                            content: [
                                {
                                    type: "text",
                                    text: `Directory: ${path}\n\n${formatted}`,
                                },
                            ],
                        };
                    }

                    case "calculate": {
                        const { expression } = CalculateArgsSchema.parse(args);
                        // Simple and safe mathematical expression evaluation
                        // Only allow basic arithmetic operations
                        const sanitized = expression.replace(/[^0-9+\-*/.() ]/g, "");
                        if (sanitized !== expression) {
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
                            throw new Error(`Failed to evaluate expression: ${error instanceof Error ? error.message : String(error)}`);
                        }
                    }

                    default:
                        throw new Error(`Unknown tool: ${name}`);
                }
            } catch (error) {
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
        console.log("RUNNING");
        const authSdkBundle = await fs.readFile("./dist/script/solid-client-authn-browser.bundle.js");
        const server = http.createServer(function (req, res) {
            if (req.url?.includes("callback")) {
                console.log("CODE");
                console.log(req.url);
                // TODO: Extract `req.queryString["code"]`
                // TODO: Give it to solid sdk so it can exchange for a token
                // TODO: Remember token

                // TODO: Server a page with JS that `window.close()`
                // TODO: Close this server

                res.write("NOTHING YET");
                res.write;
                res.end();
                //server.close();
            }

            if (req.url?.includes("script")) {
                res.writeHead(200, { 'Content-Type': 'text/javascript' });
                res.write(authSdkBundle);
                res.end();
            }

            if (req.url?.includes("start")) {
                res.writeHead(200, { 'Content-Type': 'text/html' });

                res.write(`
<html>
    <head>
        <script src="./script"></script>
        <script>
            console.log("inline script")
            const { login, getDefaultSession } = SolidAuth;
            
            async function startLogin() {
              if (!getDefaultSession().info.isLoggedIn) {
                await login({
                  oidcIssuer: "https://login.inrupt.com",
                  redirectUrl: new URL("/callback", window.location.href).toString(),
                  clientName: "My application"
                });
              }
            }
            startLogin();

        </script>
    </head>
    <body>
    hello world
    </body>
</html>
`);
                res.end();
            }
        }).listen(2233);
        console.log("SERVER RAN")




        // start webserver or listen to port 2233 whatever
        // serve a 'start authorization code' page
        // serve a 'callback' page
        await open('http://localhost:2233/start', { wait: true });
        // that page sends to idp withe redirect_uri=http://localhost:2233/callback
        // callback page (on server) gets code, passess back to this process
        // here: exchange code for token using inrupt sdk
        // profit


        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        console.error("Solid MCP Server running on stdio");
    }
}

// Start the server
const server = new SolidMCPServer();
server.run().catch((error) => {
    console.error("Failed to start server:", error);
    process.exit(1);
});
