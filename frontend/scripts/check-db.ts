import "dotenv/config";
import mongoose from "mongoose";

async function checkDatabase(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI is missing. Add it to frontend/.env before checking the database.");
    process.exitCode = 1;
    return;
  }
  if (!uri.startsWith("mongodb://") && !uri.startsWith("mongodb+srv://")) {
    console.error("MONGODB_URI is present but must start with mongodb:// or mongodb+srv://.");
    process.exitCode = 1;
    return;
  }

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
    const database = mongoose.connection.db;
    if (!database) throw new Error("Database handle unavailable");

    await database.admin().command({ ping: 1 });
    const topology = await database.admin().command({ hello: 1 });
    const supportsTransactions = Boolean(topology.setName || topology.msg === "isdbgrid");

    console.log("MongoDB connection and authentication: OK");
    console.log(`Topology: ${topology.setName ? "replica set" : topology.msg === "isdbgrid" ? "sharded" : "standalone"}`);
    console.log(`Multi-document transactions: ${supportsTransactions ? "supported" : "not supported"}`);

    if (!supportsTransactions) process.exitCode = 1;
  } catch (error) {
    const diagnostic = error as Error & {
      code?: string | number;
      cause?: Error & { code?: string | number };
      reason?: {
        type?: string;
        servers?: Map<string, { error?: { code?: string | number } }>;
      };
    };
    const serverCode = [...(diagnostic.reason?.servers?.values() ?? [])]
      .find((server) => server.error?.code)?.error?.code;
    const code = diagnostic.code ?? diagnostic.cause?.code ?? serverCode;
    const topology = diagnostic.reason?.type;
    console.error(
      `MongoDB check failed (${diagnostic.name}${topology ? `, topology ${topology}` : ""}${code ? `, code ${code}` : ""}). Verify the Atlas cluster hostname/status and Network Access IP allowlist.`
    );
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

void checkDatabase();