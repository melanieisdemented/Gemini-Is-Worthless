import Dexie, { Table } from 'dexie';

export interface FileRecord {
  id?: number;
  key: string;
  data: string;
  mimeType: string;
  timestamp: number;
}

export class AppDatabase extends Dexie {
  files!: Table<FileRecord, number>;

  constructor() {
    super('AppStorageDB');
    this.version(1).stores({
      files: '++id, key, timestamp'
    });
  }
}

export const db = new AppDatabase();

export const saveFile = async (key: string, data: string, mimeType: string) => {
  await db.files.where('key').equals(key).delete();
  await db.files.add({
    key,
    data,
    mimeType,
    timestamp: Date.now()
  });
};

export const getFile = async (key: string) => {
  const record = await db.files.where('key').equals(key).first();
  return record;
};

export const deleteFile = async (key: string) => {
  await db.files.where('key').equals(key).delete();
};
