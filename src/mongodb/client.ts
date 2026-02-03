import "dotenv/config";
import { MongoClient, Db, Collection } from "mongodb";

const DATABASE_URL = process.env.DATABASE_URL || "mongodb://localhost:27017";
const DATABASE_NAME = process.env.DATABASE_NAME || "canvas_db";
const COLLECTION_NAME = "canvases";

let client: MongoClient | null = null;
let db: Db | null = null;
let collection: Collection | null = null;

export async function connectMongoDB(): Promise<void> {
  if (client) return;

  client = new MongoClient(DATABASE_URL);
  await client.connect();

  db = client.db(DATABASE_NAME);

  collection = db.collection(COLLECTION_NAME);
  await collection.createIndex({ id: 1 }, { unique: true });
}

export function getCollection(): Collection {
  if (!collection) throw new Error("MongoDB가 연결되지 않았습니다.");

  return collection;
}

export async function disconnectMongoDB(): Promise<void> {
  if (!client) return;

  await client.close();

  client = null;
  db = null;
  collection = null;
}
