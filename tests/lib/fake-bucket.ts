// Minimal in-memory stand-in for the R2 methods the signup code uses.

export function fakeBucket() {
  const store = new Map<string, string>();
  const bucket = {
    async get(key: string) {
      if (!store.has(key)) return null;
      const value = store.get(key) as string;
      return { text: async () => value };
    },
    async put(key: string, value: string) {
      store.set(key, value);
      return {};
    },
  };
  return { store, bucket: bucket as unknown as R2Bucket };
}
