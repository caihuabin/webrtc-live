const webrtc = require('wrtc')
const WebSocket = require('ws')
const { Readable }  = require('stream')
const ffmpeg = require('fluent-ffmpeg')
const path = require('path')

const ws = new WebSocket('ws://localhost:3000')

const pc = new webrtc.RTCPeerConnection({iceServers: [{urls: "stun:stun.services.mozilla.com"}]})
const MAX_BUFFERED_AMOUNT = 64 * 1024
const rs = new Readable()
rs._read = () => {}

let channel
let channelName
let channelReady = false

const begin = Date.now()
ffmpeg()
.input(rs)
.videoCodec('libx264')
.audioCodec('copy')
.addOption('-threads', 2)
.addOption('-f', 'hls')
.addOption('-hls_segment_filename', 'static/video-dist2/segment%03d.ts')
.addOption('-hls_time', 5)
.addOption('-hls_list_size', 6)
.addOption('-preset', 'veryfast')
.on('end', function () {
  console.log('file has been converted succesfully,time:', Date.now() - begin);
})
.on('error', function (err) {
  console.log('an error happened: ' + err.message);
})
.save(path.join(__dirname, './static/video-dist2/video.m3u8'))


// pc.onaddstream = function (obj) {
//   debugger
//   console.log(obj)
// }

pc.ondatachannel = function(event) {
  if (!event.channel) {
    throw(new Error('Data channel event is missing `channel` property'))
  }
  channel = event.channel
  channel.binaryType = 'arraybuffer'

  if (typeof channel.bufferedAmountLowThreshold === 'number') {
    channel.bufferedAmountLowThreshold = MAX_BUFFERED_AMOUNT
  }
  channelName = channel.label

  channel.onmessage = function (event) {
    if (!channelReady) {
      return
    }
    let data = event.data
    if (data instanceof ArrayBuffer) {
      data = Buffer.from(data)
    }
    rs.push(data)
  }
  channel.onbufferedamountlow = function () {
    throw(new Error('buffered amount low'))
  }
  channel.onopen = function () {
    channelReady = true
  }
  channel.onclose = function () {
    console.log('close')
  }
  channel.onerror = function (err) {
    throw(err)
  }
}

pc.onicecandidate = function(e) {
  if (e.candidate) {
    ws.send(JSON.stringify({ type: 'candidate', candidate: e.candidate }))
  }
}
const errorCallback = (err) => {
  console.log(err)
  pc.close()
}

new Promise(resolve => ws.addEventListener('open', resolve))
.then(() => {
  ws.send(JSON.stringify({ type: 'ok' }))
  return new Promise(
    resolve => ws.addEventListener('message', (event) => {
      const data = JSON.parse(event.data)
      if (data.type === 'ok') {
        resolve()
      }
      if (data.type === 'offer') {
        pc.setRemoteDescription(new webrtc.RTCSessionDescription(data.offer), function() {
          pc.createAnswer(function(answer) {
            pc.setLocalDescription(new webrtc.RTCSessionDescription(answer), function() {
              ws.send(JSON.stringify({ type: 'answer', answer }))
            }, errorCallback)
          }, errorCallback)
        }, errorCallback)
      }
      if (data.type === 'candidate') {
        pc.addIceCandidate(new webrtc.RTCIceCandidate(data.candidate))
      }
    })
  )
})
.catch(errorCallback)
