import polyfill from './polyfill'

const { RTCPeerConnection, RTCSessionDescription, playMediaStream, getUserMedia } = polyfill
const $localVideo = window.document.getElementById('local-video')
const $remoteVideo = window.document.getElementById('remote-video')

const playVideo = ($video, stream) => playMediaStream($video, stream)

class Peer {
  constructor() {
    this.isCaller = !window.location.search
    this.ws = new WebSocket('ws://' + window.location.host)
    this.pc = new RTCPeerConnection({iceServers: [{urls: "stun:stun.services.mozilla.com"}]})
    this.init()
  }
  init() {
    const ws = this.ws
    const pc = this.pc
    const errorCallback = this.errorCallback.bind(this)
    new Promise(resolve => this.ws.addEventListener('open', resolve))
    .then(() => { window.onbeforeunload = () => ws.close() })
    .then(() => {
      this.pc.onaddstream = obj => playVideo($remoteVideo, obj.stream)
      this.pc.onicecandidate = (e) => {
        if (e.candidate) {
          this.ws.send(JSON.stringify({ type: 'candidate', candidate: e.candidate }))
        }
      }
    })
    .then(() => getUserMedia({
      audio: true,
      video: true
    }))
    .then((stream) => {
      playVideo($localVideo, stream)
      this.pc.addStream(stream)
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