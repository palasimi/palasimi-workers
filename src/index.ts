// SPDX-License-Identifier: MIT
// Copyright (c) 2023 Levi Gruspe

export interface ServerHandlers {
  [name: string]: (value: unknown) => unknown;
}

export enum Status {
  Fail,
  Pending,
  Success,
}

export type Query = {
  name: string;
  value: unknown;
  pollingCycle?: number;
};

export type Response = {
  id: number;
  name: string;
  value: unknown;
  status: Status;
};

export type QueryFunction = (query: Query) => Promise<Response>;

// Evaluate request.
function evaluate(handlers: ServerHandlers, request: Response): Response {
  const { id, name, value } = request;
  const handler = handlers[name];
  if (handler == null) {
    const error = new Error(`unknown command: ${name}`);
    return {
      id,
      name,
      value: error,
      status: Status.Fail,
    };
  }

  try {
    return {
      id,
      name,
      value: handler(value),
      status: Status.Success,
    };
  } catch (error) {
    return {
      id,
      name,
      value: error,
      status: Status.Fail,
    };
  }
}

export function initServer(handlers: ServerHandlers) {
  self.onmessage = (event) => {
    const response = evaluate(handlers, event.data);

    // This may throw an exception if the response value can't be cloned.
    self.postMessage(response);
  };
}

export function initClient(
  worker: Worker,
  defaultPollingCycle = 50
): QueryFunction {
  // Sequence number for requests.
  let sequenceNumber = 0;

  // Contains requests/responses, indexed by sequence number.
  const cache = new Map();

  worker.onmessage = (event) => {
    const result = event.data;
    cache.set(result.id, result);

    // Make sure result status is not pending.
    if (result.status === Status.Pending) {
      result.status = Status.Fail;
    }
  };

  return async (query) => {
    // Assign a sequence number to the request.
    const id = sequenceNumber++;

    const pollingCycle =
      query.pollingCycle == null ? defaultPollingCycle : query.pollingCycle;

    const request = {
      id,
      name: query.name,
      value: query.value,
      status: Status.Pending,
    };

    cache.set(id, request);
    worker.postMessage(request);

    for (;;) {
      const response = cache.get(id);
      if (response.status !== Status.Pending) {
        cache.delete(id);
        return Promise.resolve(response);
      }

      // If the current query is still pending, wait a few milliseconds.
      await new Promise((resolve) => setTimeout(resolve, pollingCycle));
    }
  };
}
