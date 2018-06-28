const Koa = require('koa')
const WebSocket = require('ws')
const serve = require('koa-static')
const path = require('path')
const http = require('http')
const peer = require('./peer')
// const koaBody = require('koa-body')

const app = new Koa()
app.use(serve(path.join(__dirname, './static/'), {
  // maxage: 30 * 24 * 3600 * 1000,
  maxage: 0
}))
// app.use(koaBody())
const server = http.createServer(app.callback())
const wss = new WebSocket.Server({ server })

wss.broadcast = function broadcast(data) {
  wss.clients.forEach(function each(client) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data)
    }
  })
}

const chat = {
  owner: false,
  client: false
}

let count = 0
wss.on('connection', function connection(ws, req) {
  // You might use location.query.access_token to authenticate or share sessions
  // or req.headers.cookie (see http://stackoverflow.com/a/16395220/151312)

  ws.on('message', function incoming(message) {
    const json = JSON.parse(message)
    if (json.type === 'ok') {
      count += 1
      if (count === 2) {
        wss.broadcast(JSON.stringify({ type: 'ok' }))
      }
    }
    // console.log('received: %s', message)
    const others = Array.from(wss.clients).filter(client => client !== ws && client.readyState === WebSocket.OPEN)
    if (others.length > 0) {
      others.forEach(client => client.send(message))
    }
  })
  ws.on('close', () => {
    count -= 1
  })
})

server.listen(3000, function listening() {
  console.log('Listening on %d', server.address().port)
})