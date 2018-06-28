const URL = window.URL || window.webkitURL || window.mozURL || window.msURL
const RTCPeerConnection = window.RTCPeerConnection || window.webkitRTCPeerConnection || window.mozRTCPeerConnection
const RTCSessionDescription = window.RTCSessionDescription || window.webkitRTCSessionDescription || window.mozRTCSessionDescription

let getUserMedia = navigator.mediaDevices && navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices)

if (!getUserMedia) {
  getUserMedia = (constraints) => {
    const temp = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || Promise.reject(new Error('getUserMedia is not implemented in this browser'))

    return new Promise((resolve, reject) => temp.call(navigator, constraints, resolve, reject))
  }
}
const playMediaStream = ($video, stream) => {
  const SRC_OBJECT = 'srcObject' in $video ? 'srcObject' : ('mozSrcObject' in $video ? 'mozSrcObject' : ('webkitSrcObject' in $video ? 'webkitSrcObject' : null))
  if (SRC_OBJECT) {
    $video[SRC_OBJECT] = stream
  } else {
    $video.src = URL && URL.createObjectURL(stream) || stream
  }
  $video.onloadedmetadata = function (e) {
    $video.play()
  }
}

export default { RTCPeerConnection, RTCSessionDescription, playMediaStream, getUserMedia }
