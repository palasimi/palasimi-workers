# palasimi-workers

Promise-based request-response API for dedicated web workers.

## Installation

```bash
npm i @palasimi/workers
```

## Usage

```typescript
// worker.ts, compiles to /dist/worker.js
import { initServer } from "@palasimi/workers";

initServer({
  ping: () => "pong",
  pong: () => "ping",
  add: (xs) => xs.reduce((x, y) => x + y),
});

// index.ts
import { initClient } from "@palasimi/workers";

const worker = new Worker("/dist/worker.js");
const call = initClient(worker);

call({ name: "ping" }).then(console.log);
// {id: 1, name: 'ping', value: 'pong', status: 2}

call({ name: "pong" }).then(console.log);
// {id: 2, name: 'pong', value: 'ping', status: 2}

call({ name: "add", value: [1, 2, 3, 4, 5] }).then(console.log);
// {id: 3, name: 'add', value: 15, status: 2}
```

## License

[MIT](./LICENSE)
