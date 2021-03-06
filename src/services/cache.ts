import { Storage, StoreOptions } from "cluster-storage";

declare global {
    namespace app {
        interface Config {
            cache?: StoreOptions & { name: string };
        }
        namespace services {
            const cache: ModuleProxy<CacheService>;
        }
    }
}

export default class CacheService {
    protected cache: Storage;

    async set<T>(path: string, data: T, ttl?: number) {
        return this.cache.set(path, data, ttl);
    }

    async get<T>(path: string) {
        return this.cache.get<T>(path);
    }

    async has(path: string) {
        return this.cache.has(path);
    }

    async delete(path: string) {
        return this.cache.delete(path);
    }

    close() {
        return this.cache.close();
    }

    destroy() {
        return this.cache.destroy();
    }

    sync() {
        return this.cache.sync();
    }

    static getInstance() {
        let service = new this;
        let options: app.Config["cache"] = {
            name: "sfn",
            path: app.ROOT_PATH + "/cache",
            ...app.config.cache
        };

        service.cache = new Storage(options.name, options);

        return service;
    }
}