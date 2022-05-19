/*
    dependency:
    "cors": "^2.8.5",
    "express": "^4.17.1",

    start:
    node ./nymphea-mock/mock.js
*/
const express = require('express');
const cors = require('cors');
const http = require('http');
const WebSocket = require('ws');
const { getFormattedWSLog, writeToFile } = require('./utils.js');
const dumpTestLog = require('./dump-log.json');
//import dumpTestLog from `./dump-log.json` assert { type: `json` };

const app = express();
const port = 8000;
const jsonParser = express.json();

app.use(cors());

app.post('/mock', jsonParser, function (request, response) {
  console.log('\nHTTP:', request.body);
  if (!request.body) return response.sendStatus(400);
  if (request.body.needError) {
    return response.sendStatus(400);
  }
  if (request.body.delay) {
    setTimeout(() => {
      response.json(request.body.mockRequest);
    }, request.body.delay);
    return;
  }
  response.json(request.body.mockRequest); // отправляем пришедший ответ обратно
});

app.get('/', (request, response) => {
  response.send('GET NOT SUPPORTED! use only post');
});

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

wss.on('connection', (socket) => {
  console.log('WS connection');
  let streams;

  const isStreamCancelled = (stream) => !streams.has(stream);
  const abortStreams = () => (streams = new WeakSet());
  const addStream = () => {
    const pointer = {};
    streams.add(pointer);
    return pointer;
  };

  abortStreams();

  socket.on('message', (message) => {
    console.log('WS send message');
    try {
      const { realRequest, mockRequest } = JSON.parse(message);

      console.log('\nWS:', realRequest);
      writeToFile('logs', 'websocket_last_request.txt', getFormattedWSLog(realRequest, mockRequest));

      if (!mockRequest) return;

      const { mockResponse, useFile, chunkLength, limit, stopAll, delay } = mockRequest;
      if (stopAll) abortStreams();
      if (!mockResponse && !useFile) return;
      let responseData;
      if (useFile) {
        responseData = dumpTestLog;
      } else {
        responseData = Array.isArray(mockResponse) ? mockResponse : [mockResponse];
      }
      function* chunkGenerator() {
        let i = 0;
        while (i < limit) {
          yield new Promise((resolve) => {
            setTimeout(resolve, delay || 0);
          }).then(() => responseData.slice(i, (i += chunkLength)));
        }
      }

      const stream = addStream();
      (async function () {
        for await (const chunk of chunkGenerator()) {
          if (isStreamCancelled(stream)) return;
          socket.send(JSON.stringify(chunk));
        }
      })();
    } catch (err) {
      console.log('WebSocket error:', err.message);
    }
  });
});

server.listen(port, (err) => {
  if (err) {
    return console.log('Something bad happened', err);
  }
  console.log(`HTTP and WebSocket servers are listening the port ${port}`);
});
