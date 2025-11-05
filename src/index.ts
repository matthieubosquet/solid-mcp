import open from "open";
import http from "node:http";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { Session } from "@inrupt/solid-client-authn-node";

let session: Session;

const server = new McpServer({ name: "mcpservername1", version: "0.0.0" });
server.registerTool(
    "readSolidResourceContent",
    {
        title: "Tool for reading the contents of a Solid resource as text",
        description:
            "This tool takes a single input parameter which is the URI of a Solid resource; it returns output which consists of the contents of the given Solid resource.",
        inputSchema: { resourceUri: z.string() },
    },
    async (input) => {
        if (!session.info.isLoggedIn) {
            return {
                content: [
                    {
                        type: "text",
                        text: "not authenticated",
                    },
                ],
            };
        }

        const response = await session.fetch(input.resourceUri);
        return {
            content: [
                {
                    type: "text",
                    text: await response.text(),
                },
            ],
        };
    }
);

const httpServer = http
    .createServer(async (req, res) => {
        if (req.url?.includes("callback")) {
            await session.handleIncomingRedirect(
                `http://localhost:2233${req.url}`
            );

            res.write("<html><body>close this window</body></html>");
            res.end();

            httpServer.close();
        }

        if (req.url?.includes("start")) {
            session = new Session({ keepAlive: false });

            await session.login({
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
await server.connect(transport);
