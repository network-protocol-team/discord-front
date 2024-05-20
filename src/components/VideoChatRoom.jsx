import CameraAltIcon from '@mui/icons-material/CameraAlt';
import MicIcon from '@mui/icons-material/Mic';
import CallEndIcon from '@mui/icons-material/CallEnd';
import { useChatStore } from '../data/store';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';
import { useEffect, useRef, useState } from 'react';
import { sendToServer } from '../utils/socket';

export default function VideoChatRoom() {
  // 소켓은 ref 로 관리
  const videoSocket = useRef(null);
  const localVideoRef = useRef(null);
  const localStreamRef = useRef(null);

  const selectedId = useChatStore((state) => state.selectedId);
  const nickName = useChatStore((state) => state.nickName);
  const userKey = nickName;

  const [otherUsers, setOtherUsers] = useState({});
  const [remoteStreams, setRemoteStreams] = useState({});
  const [joined, setJoined] = useState(false); // 접속이 완료되었는지

  // videoSocket 용 signaling 서버로 보내는 함수
  const sendToVideoServer = sendToServer(videoSocket.current);

  const configuration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
  };

  const startLocalStream = async () => {
    try {
      localStreamRef.current = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      localVideoRef.current.srcObject = localStreamRef.current;
    } catch (err) {
      console.error('Error accessing local media:', err);
    }
  };

  const connectVideoSocket = () => {
    const socket = new SockJS(import.meta.env.VITE_SOCK_URL);
    const camKey = nickName;
    videoSocket.current = new Client({
      webSocketFactory: () => socket,
      // brokerURL: 'ws://localhost:8000/ws',
      onConnect: () => {
        console.log('Connected to video webSocket');

        // subscribe api 작성

        videoSocket.subscribe(
          `/sub/channels/${selectedId}/video/offer/${camKey}`,
          onOffer,
        );
        videoSocket.subscribe(
          `/sub/channels/${selectedId}/video/answer/${camKey}`,
          onAnswer,
        );
        videoSocket.subscribe(
          `/sub/channels/${selectedId}/video/ice-candidate/${camKey}`,
          onCandidate,
        );
        videoSocket.subscribe(
          `/sub/channels/${selectedId}/video/call-members`,
          onMembers,
        );
        videoSocket.subscribe(
          `/sub/channels/${selectedId}/video/receive-other`,
          onOthers,
        );

        // 먼저 채널에 접속했음을 알린다.
        callMembers();
      },
      onDisconnect: () => {
        console.log('Disconnected from video webSocket');
      },
    });
    videoSocket.current.activate();
  };

  const parseMessage = (message) => JSON.parse(message.body);

  // subscriber 함수 정의

  const onOffer = async (message) => {
    const data = parseMessage(message);
    const { sender, offer } = data;

    // 자기 자신이 보낸 offer은 무시
    if (sender === nickName) return;

    // 보낸 사람(신규 유저)의 이름으로 rtc peer 만듦
    const peerConnection = getPeerConnection(sender);

    // remote description 에 추가
    await peerConnection.setRemoteDescription(offer);

    // answer 생성 후 local description 에 추가
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    // 기존에 설정한 peer 을 덮어쓰기
    setOtherUsers((prev) => ({
      ...prev,
      [sender]: peerConnection,
    }));

    // answer 보내기
    await sendAnswer(sender, answer);
  };

  const onAnswer = async (message) => {
    const data = parseMessage(message);
    const { sender, answer } = data;

    // 보낸 사람(기존 유저)의 rtc peer에 remote description 추가
    const peerConnection = getPeerConnection(sender);
    await peerConnection.setRemoteDescription(answer);

    // 기존에 설정한 peer 을 덮어쓰기
    setOtherUsers((prev) => ({
      ...prev,
      [sender]: peerConnection,
    }));
  };

  const onCandidate = async (message) => {
    const data = parseMessage(message);
    const { sender, iceCandidate } = data;

    // rtc peer를 바로 가져옴
    const peerConnection = otherUsers[sender];

    if (!peerConnection) {
      throw new Error('없는 사용자로부터 온 ice-candidate 요청입니다.');
    }

    // iceCandidate 를 등록해줌
    await peerConnection.addIceCandidate(new RTCIceCandidate(iceCandidate));

    // 완벽히 연결되었으면 joined 되었다고 명시
    setJoined(true);
  };

  const onMembers = () => {
    console.log(`sub: call-member to ${nickName}`);

    // 누군가 접속했다고 하면 자신의 정보를 준다.
    sendMe();
  };

  const onOthers = async (message) => {
    // 다른 사람들의 정보를 받음

    const data = parseMessage(message);
    const { sender, channelId } = data;

    if (channelId !== selectedId) {
      throw new Error('잘못된 채팅방으로부터 요청이 날아왔습니다.');
    }

    // 자기 자신의 이름을 받으면 무시
    if (sender === nickName) return;

    // RTC peer 를 만들고, 리스트에 추가
    const peerConnection = getPeerConnection(sender);
    setOtherUsers((prev) => ({
      ...prev,
      [sender]: prev[sender] || peerConnection, // sender 에 대해 없으면 추가
    }));

    // 처음 들어왔으면 다른 사용자들에게 offer 보냄
    if (!joined) {
      await sendOffer(sender);
    }
  };

  // publisher 함수 정의

  // 현재 유저(신규 가입자; nickName)가 다른 유저(receiver)에게 offer 보냄
  const sendOffer = async (receiver) => {
    // 자기 자신의 이름을 받으면 무시
    if (receiver === nickName) return;

    if (!otherUsers[receiver]) {
      throw new Error('없는 사용자에게 offer 를 보내려고 합니다.');
    }

    // 상대방을 나타내는 RTC peer 생성
    const peerReceiver = getPeerConnection(receiver);
    const offer = await peerReceiver.createOffer();
    await peerReceiver.setLocalDescription(offer);

    sendToVideoServer(`/pub/channels/${selectedId}/video/offer/${receiver}`, {
      sender: nickName,
      channelId: selectedId,
      userKey,
      offer,
    });
  };

  // 기존 유저가 신규 유저에게 answer 보냄
  const sendAnswer = (receiver, answer) => {
    // 자기 자신의 이름을 받으면 무시
    if (receiver === nickName) return;

    if (!otherUsers[receiver]) {
      throw new Error('없는 사용자에게 offer 를 보내려고 합니다.');
    }

    sendToVideoServer(`/pub/channels/${selectedId}/video/answer/${receiver}`, {
      sender: nickName,
      channelId: selectedId,
      userKey,
      answer,
    });
  };
  const sendCandidate = () => {};
  const callMembers = () => {
    sendToVideoServer(`/pub/channels/${selectedId}/video/call-members`, {
      sender: nickName,
      channelId: selectedId,
    });
  };
  const sendMe = () => {
    sendToVideoServer(`/pub/channels/${selectedId}/send-me`, {
      sender: nickName,
      channelId: selectedId,
      userKey: nickName, // TODO: userKey 에 정확한 값 넣기
    });
  };

  // webRTC 관련 함수 정의
  const getPeerConnection = (targetId) => {
    return otherUsers[targetId] || createPeerConnection(targetId);
  };

  const createPeerConnection = (targetId) => {
    const peerConnection = new RTCPeerConnection(configuration);

    peerConnection.onicecandidate = (event) => {
      if (!event.candidate) return;

      sendToVideoServer(
        `/pub/channels/${selectedId}/video/ice-candidate/${targetId}`,
        {
          sender: nickName,
          channelId: selectedId,
          userKey,
          iceCandidate: event.candidate,
        },
      );
    };

    peerConnection.ontrack = (event) => {
      setRemoteStreams((prevStreams) => ({
        ...prevStreams,
        [targetId]: event.streams[0],
      }));
    };

    localStreamRef.current.getTracks().forEach((track) => {
      peerConnection.addTrack(track, localStreamRef.current);
    });

    return peerConnection;
  };

  const endCall = () => {
    // 연결한 rtc peer 들 해제
    Object.values(otherUsers).forEach((peerConnection) =>
      peerConnection.close(),
    );
    setOtherUsers({});
    setRemoteStreams({});

    // 카메라, 마이크 off
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    setJoined(false);

    // 소켓 닫기
    videoSocket.current.deactivate();
  };

  // 소켓 activate 및 deactivate
  useEffect(() => {
    startLocalStream(); // 카메라, 마이크 on
    connectVideoSocket(); // 소켓 연결
    return () => {
      endCall();
    };
  }, [selectedId]);

  return (
    <div className="video-chat-wrapper">
      <div className="video-grid">
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          style={{ width: '300px', marginRight: '20px' }}
        />
        {Object.entries(remoteStreams).map(([peerId, stream]) => (
          <video
            key={peerId}
            ref={(video) => {
              if (video) video.srcObject = stream;
            }}
            autoPlay
            playsInline
            style={{ width: '300px', marginRight: '20px' }}
          />
        ))}
      </div>
      <div className="video-buttons">
        <button className="camera">
          <CameraAltIcon />
        </button>
        <button className="mic">
          <MicIcon />
        </button>
        <button className="end">
          <CallEndIcon />
        </button>
      </div>
    </div>
  );
}

const VideoBox = () => {
  return <div className="video-box"></div>;
};

const calcVideoBoxSize = (num) => {
  const $videoGrid = document.querySelector('.video-grid');
  const maxHeight = 800;
  const maxWidth = getComputedStyle($videoGrid).width;
  const gap = 16;
  const ratio = 16 / 9;

  let height, width;
  for (let maxRow = 1; ; maxRow++) {
    height = (maxHeight - (maxRow - 1) * gap) / maxRow;
    width = ratio * height;
    const maxColumn = Math.ceil(num / maxRow);
    const res = maxColumn * width + (maxColumn - 1) * gap;

    if (res <= maxWidth) break;
  }

  return { height, width };
};
