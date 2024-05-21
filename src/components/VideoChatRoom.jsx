import CameraAltIcon from '@mui/icons-material/CameraAlt';
import MicIcon from '@mui/icons-material/Mic';
import CallEndIcon from '@mui/icons-material/CallEnd';
import { useChatStore } from '../data/store';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';
import { useEffect, useRef, useState } from 'react';
import { sendToServer } from '../utils/socket';
import { logClient, sleep } from '../utils/common';
import { Exception } from 'sass';

export default function VideoChatRoom() {
  // 소켓은 ref 로 관리
  const videoSocket = useRef(null);
  const localVideoRef = useRef(null);
  const localStreamRef = useRef(null);

  const selectedId = useChatStore((state) => state.selectedId);
  const nickName = useChatStore((state) => state.nickName);
  const userKey = nickName;

  // const [otherUsers, setOtherUsers] = useState({});
  const [remoteStreams, setRemoteStreams] = useState({});

  const otherUsers = useRef({});

  // videoSocket 용 signaling 서버로 보내는 함수
  const sendToVideoServer = sendToServer(videoSocket);

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
      debug: () => {},
      reconnectDelay: 5000, // 자동 재 연결
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,

      onConnect: () => {
        logClient('Connected to video webSocket');

        // subscribe api 작성

        videoSocket.current.subscribe(
          `/sub/channels/${selectedId}/video/offer/${camKey}`,
          onOffer,
        );
        videoSocket.current.subscribe(
          `/sub/channels/${selectedId}/video/answer/${camKey}`,
          onAnswer,
        );
        videoSocket.current.subscribe(
          `/sub/channels/${selectedId}/video/ice-candidate/${camKey}`,
          onCandidate,
        );
        videoSocket.current.subscribe(
          `/sub/channels/${selectedId}/call-members`,
          onMembers,
        );
        videoSocket.current.subscribe(
          `/sub/channels/${selectedId}/receive-other`,
          onOthers,
        );

        // 먼저 채널에 접속했음을 알린다.
        callMembers();

        // 1초 후에, otherUsers 에 저장된 user 들에게 offer 를 보낸다.
        sleep(1000).then(
          async () =>
            await Promise.all(
              Object.keys(otherUsers.current).map(
                async (receiver) => await sendOffer(receiver),
              ),
            ),
        );
      },
      onDisconnect: () => {
        console.log('Disconnected from video webSocket');
      },
      onStompError: (frame) => {
        console.error(frame);
      },
    });
    videoSocket.current.activate();
  };

  const parseMessage = (message) => JSON.parse(message.body);

  // subscriber 함수 정의

  const onOffer = async (message) => {
    logClient('on offer');

    const data = parseMessage(message);
    const { sender, offer } = data;

    // 자기 자신이 보낸 offer은 무시
    if (sender === nickName) return;

    // 보낸 사람(신규 유저)의 이름으로 rtc peer 만듦
    const peerConnection = createPeerConnection(sender);

    // 기존에 설정한 peer 을 덮어쓰기
    otherUsers.current = {
      ...otherUsers.current,
      [sender]: peerConnection,
    };

    // remote description 에 추가
    await peerConnection.setRemoteDescription(offer);

    // answer 생성 후 local description 에 추가
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    // answer 보내기
    await sendAnswer(sender, answer);
  };

  const onAnswer = async (message) => {
    logClient('on answer');

    const data = parseMessage(message);
    const { sender, answer } = data;

    if (otherUsers.current[sender] === undefined) {
      throw new Exception('없는 사용자로부터 answer를 받았습니다.');
    }

    // 보낸 사람(기존 유저)의 rtc peer에 remote description 추가
    const peerConnection = otherUsers.current[sender];

    // 기존에 설정한 peer 을 덮어쓰기
    otherUsers.current = {
      ...otherUsers.current,
      [sender]: peerConnection,
    };

    await peerConnection.setRemoteDescription(answer);

    Object.keys(otherUsers.current).forEach((name) => {
      console.log(name, otherUsers.current[name]);
    });
  };

  const onCandidate = async (message) => {
    logClient('on candidate');

    const data = parseMessage(message);
    const { sender, iceCandidate } = data;

    // rtc peer를 바로 가져옴
    const peerConnection = otherUsers.current[sender];

    if (peerConnection === undefined) {
      throw new Error('없는 사용자로부터 온 ice-candidate 요청입니다.');
    }

    // iceCandidate 를 등록해줌
    await peerConnection.addIceCandidate(new RTCIceCandidate(iceCandidate));
  };

  const onMembers = () => {
    logClient('on members');

    // 누군가 접속했다고 하면 자신의 정보를 준다.
    sendMe();
  };

  const onOthers = async (message) => {
    logClient('on others');

    // 다른 사람들의 정보를 받음
    const data = parseMessage(message);

    console.log(data);
    const { sender, channelId } = data;

    if (channelId !== selectedId) {
      throw new Error('잘못된 채팅방으로부터 요청이 날아왔습니다.');
    }

    // 자기 자신의 이름을 받으면 무시
    if (sender === nickName) return;

    // 리스트에 key만 추가

    otherUsers.current = {
      ...otherUsers.current,
      [sender]: null, // sender 에 대해 없으면 추가
    };
  };

  // publisher 함수 정의

  // 현재 유저(신규 가입자; nickName)가 다른 유저(receiver)에게 offer 보냄
  const sendOffer = async (receiver) => {
    logClient('send offer');

    // 자기 자신의 이름을 받으면 무시
    if (receiver === nickName) return;

    if (otherUsers.current[receiver] === undefined) {
      throw new Error('없는 사용자에게 offer 를 보내려고 합니다.');
    }

    // 상대방을 나타내는 RTC peer 생성
    const peerConnection = createPeerConnection(receiver);

    // 기존에 설정한 peer 을 덮어쓰기
    otherUsers.current = {
      ...otherUsers.current,
      [receiver]: peerConnection,
    };

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    sendToVideoServer(`/pub/channels/${selectedId}/video/offer/${receiver}`, {
      sender: nickName,
      channelId: selectedId,
      userKey,
      offer,
    });
  };

  // 기존 유저가 신규 유저에게 answer 보냄
  const sendAnswer = (receiver, answer) => {
    logClient('send answer');

    // 자기 자신의 이름을 받으면 무시
    if (receiver === nickName) return;

    if (otherUsers.current[receiver] === undefined) {
      throw new Error('없는 사용자에게 answer 를 보내려고 합니다.');
    }

    sendToVideoServer(`/pub/channels/${selectedId}/video/answer/${receiver}`, {
      sender: nickName,
      channelId: selectedId,
      userKey,
      answer,
    });
  };
  const callMembers = () => {
    logClient('call members');
    sendToVideoServer(`/pub/channels/${selectedId}/call-members`, {
      sender: nickName,
      channelId: selectedId,
    });
  };
  const sendMe = () => {
    logClient('send me');

    sendToVideoServer(`/pub/channels/${selectedId}/send-me`, {
      sender: nickName,
      channelId: selectedId,
      userKey: nickName, // TODO: userKey 에 정확한 값 넣기
    });
  };

  // webRTC 관련 함수 정의

  const createPeerConnection = (targetId) => {
    const peerConnection = new RTCPeerConnection(configuration);

    peerConnection.onicecandidate = (event) => {
      logClient(`onicecandidate: ${event}`);
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

    localStreamRef.current?.getTracks().forEach((track) => {
      peerConnection.addTrack(track, localStreamRef.current);
    });

    return peerConnection;
  };

  const endCall = () => {
    // 연결한 rtc peer 들 해제
    Object.values(otherUsers.current).forEach((peerConnection) =>
      peerConnection.close(),
    );
    otherUsers.current = {};
    // setOtherUsers({});
    setRemoteStreams({});

    // 카메라, 마이크 off
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }

    // 소켓 닫기
    videoSocket.current.deactivate();
  };

  // 소켓 activate 및 deactivate
  useEffect(() => {
    // 이미 소켓이 있으면 정리해준다
    if (videoSocket.current) {
      endCall();
    }

    startLocalStream(); // 카메라, 마이크 on
    connectVideoSocket(); // 소켓 연결

    // component unmount 시 소켓 정리
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
