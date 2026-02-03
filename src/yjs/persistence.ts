import * as Y from "yjs";
import { getCollection } from "../mongodb/client";

export async function saveYjsDoc(canvasId: string, doc: Y.Doc) {
  const update = Y.encodeStateAsUpdate(doc);
  const collection = getCollection();

  await collection.updateOne(
    { id: canvasId },
    {
      $set: {
        id: canvasId,
        yjsData: Buffer.from(update),
      },
      $setOnInsert: {
        createdAt: new Date(),
      },
    },
    { upsert: true }
  );
}

export async function loadYjsDoc(canvasId: string, doc: Y.Doc): Promise<void> {
  const collection = getCollection();
  const canvas = await collection.findOne({ id: canvasId });

  if (!canvas || !canvas.yjsData) {
    return;
  }

  Y.applyUpdate(doc, canvas.yjsData.buffer);
}
