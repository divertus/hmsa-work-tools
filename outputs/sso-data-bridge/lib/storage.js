const DB_NAME = "sso-data-bridge";
const DB_VERSION = 1;
const DATASET_STORE = "datasets";
const CHUNK_STORE = "chunks";

let databasePromise;

export async function createDataset(metadata) {
  const db = await getDatabase();
  const dataset = {
    id: metadata.id,
    name: metadata.name || "未命名数据集",
    status: "running",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    rowCount: 0,
    pageCount: 0,
    pages: [],
    request: metadata.request,
    requestConfig: metadata.requestConfig || null,
    sourceProfileId: metadata.sourceProfileId || "",
    pagination: metadata.pagination,
    error: null
  };

  await runTransaction(db, [DATASET_STORE], "readwrite", (tx) => {
    tx.objectStore(DATASET_STORE).put(dataset);
  });

  return dataset;
}

export async function appendChunk(datasetId, rows, pageMetadata, rawResponse = null) {
  const db = await getDatabase();
  const tx = db.transaction([DATASET_STORE, CHUNK_STORE], "readwrite");
  const datasetStore = tx.objectStore(DATASET_STORE);
  const chunkStore = tx.objectStore(CHUNK_STORE);
  let updatedDataset;
  let transactionError;

  tx.onerror = () => {
    transactionError = tx.error;
  };

  const request = datasetStore.get(datasetId);
  request.onsuccess = () => {
    const dataset = request.result;
    if (!dataset) {
      tx.abort();
      transactionError = new Error("数据集不存在。");
      return;
    }

    const offset = dataset.rowCount || 0;
    chunkStore.put({
      id: `${datasetId}:${String(offset).padStart(12, "0")}`,
      datasetId,
      offset,
      rows,
      rawResponse
    });

    dataset.rowCount = offset + rows.length;
    dataset.pageCount = (dataset.pageCount || 0) + 1;
    dataset.pages = [...(dataset.pages || []), pageMetadata];
    dataset.updatedAt = Date.now();
    dataset.status = "running";
    datasetStore.put(dataset);
    updatedDataset = { ...dataset };
  };

  await transactionDone(tx);

  if (transactionError) {
    throw transactionError;
  }

  if (!updatedDataset) {
    throw new Error("写入数据分片失败。");
  }

  return updatedDataset;
}

export async function getRawDatasetBundle(datasetId) {
  const dataset = await getDataset(datasetId);
  if (!dataset) {
    return null;
  }

  const db = await getDatabase();
  const tx = db.transaction(CHUNK_STORE);
  const index = tx.objectStore(CHUNK_STORE).index("datasetId");
  const chunks = [];

  await new Promise((resolve, reject) => {
    const request = index.openCursor(IDBKeyRange.only(datasetId));
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) {
        resolve();
        return;
      }
      chunks.push(cursor.value);
      cursor.continue();
    };
  });

  return {
    ...dataset,
    chunks,
    rows: chunks.flatMap((chunk) => chunk.rows || [])
  };
}

export async function updateDataset(datasetId, patch) {
  const db = await getDatabase();
  let updatedDataset;
  let transactionError;
  const tx = db.transaction(DATASET_STORE, "readwrite");
  tx.onerror = () => {
    transactionError = tx.error;
  };

  const request = tx.objectStore(DATASET_STORE).get(datasetId);
  request.onsuccess = () => {
    const dataset = request.result;
    if (!dataset) {
      tx.abort();
      transactionError = new Error("数据集不存在。");
      return;
    }
    updatedDataset = {
      ...dataset,
      ...patch,
      updatedAt: Date.now()
    };
    tx.objectStore(DATASET_STORE).put(updatedDataset);
  };

  await transactionDone(tx);
  if (transactionError) {
    throw transactionError;
  }
  return updatedDataset;
}

export async function getDataset(datasetId) {
  const db = await getDatabase();
  return requestToPromise(db.transaction(DATASET_STORE).objectStore(DATASET_STORE).get(datasetId));
}

export async function getDatasetBundle(datasetId, limit = Number.POSITIVE_INFINITY) {
  const dataset = await getDataset(datasetId);
  if (!dataset) {
    return null;
  }

  const db = await getDatabase();
  const tx = db.transaction(CHUNK_STORE);
  const index = tx.objectStore(CHUNK_STORE).index("datasetId");
  const rows = [];

  await new Promise((resolve, reject) => {
    const request = index.openCursor(IDBKeyRange.only(datasetId));
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor || rows.length >= limit) {
        resolve();
        return;
      }

      for (const row of cursor.value.rows || []) {
        rows.push(row);
        if (rows.length >= limit) {
          break;
        }
      }

      if (rows.length >= limit) {
        resolve();
        return;
      }
      cursor.continue();
    };
  });

  return {
    ...dataset,
    rows,
    truncated: Number.isFinite(limit) && dataset.rowCount > rows.length
  };
}

export async function listDatasets() {
  const db = await getDatabase();
  const datasets = await requestToPromise(
    db.transaction(DATASET_STORE).objectStore(DATASET_STORE).getAll()
  );
  return datasets.sort((a, b) => b.createdAt - a.createdAt);
}

export async function deleteDataset(datasetId) {
  const db = await getDatabase();
  const tx = db.transaction([DATASET_STORE, CHUNK_STORE], "readwrite");
  tx.objectStore(DATASET_STORE).delete(datasetId);
  const index = tx.objectStore(CHUNK_STORE).index("datasetId");
  const request = index.openCursor(IDBKeyRange.only(datasetId));

  request.onsuccess = () => {
    const cursor = request.result;
    if (!cursor) {
      return;
    }
    cursor.delete();
    cursor.continue();
  };

  await transactionDone(tx);
}

function getDatabase() {
  if (!databasePromise) {
    databasePromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onupgradeneeded = () => {
        const db = request.result;

        if (!db.objectStoreNames.contains(DATASET_STORE)) {
          db.createObjectStore(DATASET_STORE, { keyPath: "id" });
        }

        if (!db.objectStoreNames.contains(CHUNK_STORE)) {
          const chunkStore = db.createObjectStore(CHUNK_STORE, { keyPath: "id" });
          chunkStore.createIndex("datasetId", "datasetId", { unique: false });
        }
      };
      request.onsuccess = () => resolve(request.result);
    });
  }

  return databasePromise;
}

function runTransaction(db, stores, mode, operation) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(stores, mode);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error("IndexedDB 事务被中止。"));
    tx.oncomplete = () => resolve();
    operation(tx);
  });
}

function transactionDone(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error("IndexedDB 事务被中止。"));
  });
}

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
