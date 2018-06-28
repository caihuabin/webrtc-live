import polyfill from './polyfill'

const { RTCPeerConnection, RTCSessionDescription, playMediaStream, getUserMedia } = polyfill
const $localVideo = window.document.getElementById('local-video')

const playVideo = ($video, stream) => playMediaStream($video, stream)

class Peer {
  constructor() {
    this.isCaller = !window.location.search
    this.ws = new WebSocket('ws://' + window.location.host)
    this.pc = new RTCPeerConnection({iceServers: [{urls: "stun:stun.services.mozilla.com"}]})
    this.channel = this.pc.createDataChannel("Mydata")
    this.init()
  }
  init() {
    const ws = this.ws
    const pc = this.pc
    const channel = this.channel

    const errorCallback = this.errorCallback.bind(this)
    new Promise(resolve => ws.addEventListener('open', resolve))
    .then(() => { window.onbeforeunload = () => ws.close() })
    .then(() => {
      // pc.onaddstream = obj => playVideo($remoteVideo, obj.stream)

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          ws.send(JSON.stringify({ type: 'candidate', candidate: e.candidate }))
        }
      }
    })
    .then(() => getUserMedia({
      audio: true,
      video: true
    }))
    .then((mediastream) => {
      playVideo($localVideo, mediastream)
      channel.onopen = () => {
        let top = 0
        let btm = 0
        let buffer = []
        const mediaRecorder = new window.MediaRecorder(mediastream)
        mediaRecorder.ondataavailable = (e) => {
          const reader = new window.FileReader()
          reader.readAsArrayBuffer(e.data)
          const index = top++

          reader.addEventListener('loadend', function () {
            // const buf = Buffer.from(new Uint8Array(reader.result))
            
            const buf = new Uint8Array(reader.result)
            let i = index - btm
            while (buffer.length < i) buffer.push(null)
            buffer[i] = buf
            while (buffer.length && buffer[0]) {
              var next = buffer.shift()
              btm++
              channel.send(next)
            }
          })
        }
        mediaRecorder.start(1000)
        // stream.on('data', chunk => channel.send(chunk))
      }
      // this.pc.addStream(stream)
    })
    .then(() => {
      ws.send(JSON.stringify({ type: 'ok' }))
      return new Promise(
        resolve => ws.addEventListener('message', (event) => {
          const data = JSON.parse(event.data)
          if (data.type === 'ok') {
            resolve()
          }
        })
      )
    })
    .then(() => {
      if (this.isCaller) {
        pc.createOffer(function (offer) {
          pc.setLocalDescription(new RTCSessionDescription(offer), function () {
            ws.send(JSON.stringify({ type: 'offer', offer }))
          }, errorCallback)
        }, errorCallback, {
          offerToReceiveAudio: 1,
          offerToReceiveVideo: 1
        })
        ws.addEventListener('message', function (event) {
          const data = JSON.parse(event.data)
          if (data.type === 'answer') {
            pc.setRemoteDescription(new RTCSessionDescription(data.answer), function() {
            }, errorCallback)
          }
          if (data.type === 'candidate') {
            pc.addIceCandidate(new RTCIceCandidate(data.candidate))
          }
        });
      } else {
        ws.addEventListener('message', function incoming(event) {
          const data = JSON.parse(event.data)
          if (data.type === 'offer') {
            pc.setRemoteDescription(new RTCSessionDescription(data.offer), function() {
              pc.createAnswer(function(answer) {
                pc.setLocalDescription(new RTCSessionDescription(answer), function() {
                  ws.send(JSON.stringify({ type: 'answer', answer }))
                }, errorCallback)
              }, errorCallback)
            }, errorCallback)
          }
          if (data.type === 'candidate') {
            pc.addIceCandidate(new RTCIceCandidate(data.candidate))
          }
        })
      }
    })
    .catch(errorCallback)
  }
  errorCallback(err) {
    console.log(err)
    this.pc.close()
    this.ws.close()
  }
}

new Peer()