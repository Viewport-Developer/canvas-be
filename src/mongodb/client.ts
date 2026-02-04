import "dotenv/config";
import { MongoClient, Db, Collection } from "mongodb";

const DATABASE_URL = process.env.DATABASE_URL;
const DATABASE_NAME = process.env.DATABASE_NAME;
const COLLECTION_NAME = process.env.DATABASE_COLLECTION;

let readClient: MongoClient | null = null;
let writeClient: MongoClient | null = null;
let readDb: Db | null = null;
let writeDb: Db | null = null;
let readCollection: Collection | null = null;
let writeCollection: Collection | null = null;

export async function connectMongoDB(): Promise<void> {
  if (readClient && writeClient) return;

  // 읽기 전용 클라이언트
  readClient = new MongoClient(DATABASE_URL!, {
    maxPoolSize: 20,
  });
  await readClient.connect();
  readDb = readClient.db(DATABASE_NAME);
  readCollection = readDb.collection(COLLECTION_NAME!);

  // 쓰기 전용 클라이언트
  writeClient = new MongoClient(DATABASE_URL!, {
    maxPoolSize: 80,
  });
  await writeClient.connect();
  writeDb = writeClient.db(DATABASE_NAME);
  writeCollection = writeDb.collection(COLLECTION_NAME!);

  // 인덱스 생성
  await writeCollection.createIndex({ id: 1 }, { unique: true });
}

export function getReadCollection(): Collection {
  if (!readCollection) throw new Error("MongoDB 읽기 연결이 되지 않았습니다.");

  return readCollection;
}

export function getWriteCollection(): Collection {
  if (!writeCollection) throw new Error("MongoDB 쓰기 연결이 되지 않았습니다.");

  return writeCollection;
}

export async function disconnectMongoDB(): Promise<void> {
  if (readClient) {
    await readClient.close();
    readClient = null;
    readDb = null;
    readCollection = null;
  }

  if (writeClient) {
    await writeClient.close();
    writeClient = null;
    writeDb = null;
    writeCollection = null;
  }
}
