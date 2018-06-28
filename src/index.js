import React from 'react'
import ReactDOM from 'react-dom'
import polyfill from './polyfill'
import './index.scss'

const { RTCPeerConnection, RTCSessionDescription, playMediaStream, getUserMedia } = polyfill
const playVideo = ($video, stream) => playMediaStream($video, stream)

class App extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      chats: [],
      chating: false
    }
  }

  componentDidMount() {
    const ws = this.ws = new WebSocket('ws://' + window.location.host)
    const pc = this.pc = new RTCPeerConnection({iceServers: [{urls: "stun:stun.services.mozilla.com"}]})
    this.errorCallback = this.errorCallback.bind(this)

    this.$localVideo = window.document.getElementById('local-video')
    const $remoteVideo = this.$remoteVideo = window.document.getElementById('remote-video')

    this.ready = new Promise((resolve) => {
      this.resolve = resolve
    })

    ws.addEventListener('open', () => {
      window.onbeforeunload = () => ws.close()

      ws.addEventListener('message', (event) => {
        const data = JSON.parse(event.data)
        switch (data.type) {
          case 'ok':
            this.resolve()
            break
          case 'close':
            ws.close()
            alert('对方已挂断')
            window.location.reload()
            break
          case 'chats':
            this.setState({ chats: data.chats })
            break
          case 'candidate':
            pc.addIceCandidate(new RTCIceCandidate(data.candidate))
            break
        }
      })
    })
    pc.onaddstream = obj => playVideo($remoteVideo, obj.stream)
    pc.onicecandidate = (e) => {
      if (e.candidate) {
        ws.send(JSON.stringify({ type: 'candidate', candidate: e.candidate }))
      }
    }
  }

  errorCallback(err) {
    console.log(err)
    this.pc.close()
    this.ws.close()
  }

  render() {
    const { chats, chating } = this.state
    return (
      <div>
        <div className="chat-list" style={{ display: chating ? 'none' : 'block' }}>
          {
            chats.map(item => <div className="chat-item" key={`${item.callerId}`} onClick={() => {
              const { ws, pc, ready, errorCallback, $localVideo } = this
              if (!item.answerId) {
                fetch(`/chats/${item.callerIp}`)
                .then(res => res.json())
                .then(() => this.setState({ chating: true }, () => {
                  getUserMedia({
                    audio: true,
                    video: true
                  }).then((stream) => {
                    playVideo($localVideo, stream)
                    pc.addStream(stream)
                  }).then(() => {
                    ws.send(JSON.stringify({ type: 'ok' }))
                    return ready
                  }).then(() => {
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
                    })
                  })
                }))
              }
            }} />)
          }
          <div className="chat-item chat-plus" onClick={() => {
              const { ws, pc, ready, errorCallback, $localVideo } = this
              fetch('chats')
              .then(res => res.json())
              .then(() => this.setState({ chating: true }, () => {
                getUserMedia({
                  audio: true,
                  video: true
                }).then((stream) => {
                  playVideo($localVideo, stream)
                  pc.addStream(stream)
                }).then(() => {
                  ws.send(JSON.stringify({ type: 'ok' }))
                  return ready
                }).then(() => {
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
                  })
                })
              }))
            }}>+</div>
        </div>
        <div className="video-container" style={{ display: !chating ? 'none' : 'block' }}>
          <video id="local-video" height="120" autoPlay style={{ position: 'fixed', right: 0, top: 0 }} />
          <video id="remote-video" height="100%" width="100%" autoPlay />
        </div>
      </div>
    )
  }
}

ReactDOM.render(<App />, document.getElementById('app'))
