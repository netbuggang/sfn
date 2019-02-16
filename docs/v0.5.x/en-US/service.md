<!-- title: Service; order: 10 -->
# Concept

The `Service` class is the base class in **SFN**, classes like 
`HttpController`, `WebSocketController` is inherited from it. It provides some
useful features like `i18n`, `logger`, `cache` that you can use to do real 
jobs.

## How To Use?

The `Service` class, inherited from `EventEmitter`, so does usage, you can 
define a new class then extends Service, or just use it directly. As 
convenience, you should put your service files in the `src/services/` 
directory.

### Example

#### Use Service Directly

```typescript
import { Service } from "sfn";
import { User } from "modelar";

var srv = new Service;

(async (id: number) => {
    try {
        let user = <User>await User.use(srv.db).get(id);
        srv.logger.log(`Getting user (id: ${id}, name: ${user.name}) succeed.`);
        // ...
    } catch (e) {
        srv.logger.error(`Getting user (id: ${id}) failed: ${e.message}.`);
    }
})(1);
```

#### Define A New Service Class

You can define a new service class to store the procedure of some frequently
used functions.

```typescript
// src/services/myService.ts
import { Service } from "sfn";
import { User } from "modelar";

declare global {
    namespace app {
        namespace services {
            const myService: ModuleProxy<MyService>;
        }
    }
}

export default class MyService extends Service {
    async getUser(id: number): User {
        let user: User = null;

        try {
            let data = this.cache.get(`user[${id}]`);

            if (data) {
                user = (new User).assign(data);
            } else {
                user = <User>await User.use(this.db).get(id);
                this.cache.set(`user.${id}`, user.data);
            }

            this.logger.log(`Getting user (id: ${id}, name: ${user.name}) succeed.`);
        } catch (err) {
            this.logger.error(`Getting user (id: ${id}) failed: ${err.message}.`);
        }

        return user;
    }
}
```

And then at where you need, use namespace to access the instance of this service.

```typescript
(async () => {
    let user = await app.services.myService.instance().getUser(1);
    // ...
})();
```

## Separating Services

The framework [Alar](https://github.com/hyurl/alar) that SFN uses allows 
services being separated as called as RPC procedures, so that to reduce the 
pressure of the Web server, and improve the stability. To separate the services,
you just need to do some simple configurations.

```typescript
// src/config.ts
export const config: SFNConfig = {
    server: {
        rpc: {
            "rpc-server-1": {
                host: "127.0.0.1",
                port: 8081,
                modules: [app.services.myService]
            }
        }
    }
}
```

Then create a new file and save it in `src/`, which named `rpc-server-1.ts`, the
contents is much about this:

```typescript
// src/rpc-server-1.ts
import "sfn";

app.serveRPC("rpc-server-1");
```

And use command `ts-node src/rpc-server-1` to start the individual service, then
you're able to use this remote service anywhere in the project.

```typescript
(async () => {
    let user = await app.services.myService.remote().getUser(1);
    // ...
})();
```