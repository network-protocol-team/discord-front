import CameraAltIcon from '@mui/icons-material/CameraAlt';
import MicIcon from '@mui/icons-material/Mic';
import CallEndIcon from '@mui/icons-material/CallEnd';
import { useChatStore } from '../data/store';
import { Client } from '@stomp/stompjs';
import { useEffect, useRef, useState } from 'react';
import { sendToServer } from '../utils/socket';
import { logClient, sleep } from '../utils/common';
import { Exception } from 'sass';
import { useNavigate } from 'react-router-dom';
import SockJS from 'sockjs-client';

export default function VideoChatRoom() {
  const navigation = useNavigate();
  const setSelectedId = useChatStore((state) => state.setSelectedId);

  // 소켓은 ref 로 관리
  const videoSocket = useRef(null);
  const localVideoRef = useRef(null);
  const localStreamRef = useRef(null);

  const selectedId = useChatStore((state) => state.selectedId);
  const nickName = useChatStore((state) => state.nickName);
  const userKey = nickName;

  const [isLocalStreamLoaded, setIsLocalStreamLoaded] = useState(false);
  const [remoteStreams, setRemoteStreams] = useState({});
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const isNew = useRef(true); // 새로 들어온 유저인지

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

      setIsLocalStreamLoaded(true);
    } catch (err) {
      console.error('Error accessing local media:', err);
    }
  };

  const connectVideoSocket = () => {
    const camKey = nickName;

    videoSocket.current = new Client({
      brokerURL: import.meta.env.VITE_SOCK_URL,
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
          `/sub/channels/${selectedId}/receive-other`,
          onOthers,
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

  // 나간 유저 확인
  const removeOutUsers = (userKeys) => {
    const tempOtherUsers = { ...otherUsers.current };
    const tempRemoteStreams = { ...remoteStreams };

    for (const key of Object.keys(otherUsers.current)) {
      if (userKeys.has(key)) continue;

      delete tempOtherUsers[key];
      if (remoteStreams[key] !== undefined) {
        // remoteStreams 에서도 삭제
        delete tempRemoteStreams[key];
      }
    }

    // 수정된 값으로 덮어쓰기
    otherUsers.current = { ...tempOtherUsers };
    setRemoteStreams(tempRemoteStreams);
  };

  // 들어온 유저 확인
  const addExistingUsers = (userKeys, myKey) => {
    const tempOtherUsers = { ...otherUsers.current };
    for (const key of userKeys) {
      // 자기 자신은 추가하지 않음
      if (key === myKey) continue;

      // key가 원본에 없을때만 빈 object 추가
      tempOtherUsers[key] ??= {};
    }

    // 수정된 값으로 덮어쓰기
    otherUsers.current = { ...tempOtherUsers };
  };

  // subscriber 함수 정의

  const onOffer = async (message) => {
    logClient('on offer');

    const data = parseMessage(message);
    const { sender, offer } = data;

    // 자기 자신이 보낸 offer은 무시
    if (sender === nickName) return;

    // 보낸 사람(신규 유저)의 이름으로 rtc peer 만듦
    const peerConnection = await createPeerConnection(sender);

    // 기존에 설정한 peer 을 덮어쓰기
    otherUsers.current = {
      ...otherUsers.current,
      [sender]: peerConnection,
    };

    // remote description 에 추가
    peerConnection.setRemoteDescription(offer);

    // answer 생성 후 local description 에 추가
    const answer = await peerConnection.createAnswer();
    peerConnection.setLocalDescription(answer);

    // answer 보내기
    sendAnswer(sender, answer);
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

    peerConnection.setRemoteDescription(answer);
  };

  const onCandidate = async (message) => {
    logClient('on candidate');

    const data = parseMessage(message);
    const { sender, iceCandidate } = data;

    // rtc peer를 바로 가져옴
    const peerConnection = otherUsers.current[sender];

    if (!peerConnection) {
      throw new Error('없는 사용자로부터 온 ice-candidate 요청입니다.');
    }

    // iceCandidate 를 등록해줌
    await peerConnection.addIceCandidate(new RTCIceCandidate(iceCandidate));
  };

  const onOthers = async (message) => {
    logClient('on others');

    // 다른 사람들의 정보를 받음
    const data = parseMessage(message);

    const { userKeys } = data;

    console.log('userkeys: ', userKeys);

    // 서버로부터 들어온 참여자 set
    const userKeySet = new Set(userKeys);

    // 먼저 나간사람 처리
    removeOutUsers(userKeySet);
    // 기존, 신규 유저 처리
    addExistingUsers(userKeySet, nickName);

    if (isNew.current) {
      // 기존 유저들에게 offer 보냄
      await Promise.all(
        Object.keys(otherUsers.current).map(async (otherKey) => {
          sendOffer(otherKey);
        }),
      );

      isNew.current = false;
    }
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
    const peerConnection = await createPeerConnection(receiver);

    // 기존에 설정한 peer 을 덮어쓰기
    otherUsers.current = {
      ...otherUsers.current,
      [receiver]: peerConnection,
    };

    const offer = await peerConnection.createOffer();
    peerConnection.setLocalDescription(offer);

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

  const joinUser = () => {
    logClient('join');

    sendToVideoServer(`/pub/channels/${selectedId}/send-me`, {
      sender: nickName,
      channelId: selectedId,
      userKey,
      state: 'join',
    });
  };
  const outUser = () => {
    logClient('out');

    sendToVideoServer(`/pub/channels/${selectedId}/send-me`, {
      sender: nickName,
      channelId: selectedId,
      userKey,
      state: 'out',
    });
  };

  // webRTC 관련 함수 정의

  const createPeerConnection = async (targetId) => {
    const peerConnection = new RTCPeerConnection(configuration);

    peerConnection.onicecandidate = (event) => {
      logClient(`onicecandidate`);
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
      console.log('track events!', event);
      setRemoteStreams((prevStreams) => ({
        ...prevStreams,
        [targetId]: event.streams[0],
      }));
    };

    localStreamRef.current?.getTracks().forEach((track) => {
      console.log('addtrack: ', localStreamRef.current);
      peerConnection.addTrack(track, localStreamRef.current);
    });

    return peerConnection;
  };

  const endCall = () => {
    // 카메라, 마이크 off
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }

    // 연결한 rtc peer 들 해제
    Object.values(otherUsers.current).forEach((peerConnection) =>
      peerConnection.close(),
    );
    otherUsers.current = {};
    // setOtherUsers({});
    setRemoteStreams({});

    // 소켓 닫기
    videoSocket.current.deactivate();
  };

  const toggleCamera = () => {
    const videoTrack = localStreamRef.current
      ?.getVideoTracks()
      .find((track) => track.kind === 'video');
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setIsCameraOn(videoTrack.enabled);
    }
  };

  const toggleMic = () => {
    const audioTrack = localStreamRef.current
      ?.getAudioTracks()
      .find((track) => track.kind === 'audio');
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsMicOn(audioTrack.enabled);
    }
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

  // local stream 세팅 시
  useEffect(() => {
    if (isLocalStreamLoaded) {
      // 먼저 채널에 접속했음을 알린다.
      console.log('initial ref: ', localStreamRef.current);
      joinUser();
    }
  }, [isLocalStreamLoaded]);

  const debug = () => {
    console.log(localStreamRef.current);
    console.log(remoteStreams);
  };

  return (
    <div className="video-chat-wrapper">
      <div className="video-grid">
        <video
          className="video-p2p"
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
            className="video-p2p"
            autoPlay
            playsInline
            style={{ width: '300px', marginRight: '20px' }}
          />
        ))}
      </div>
      <div className="video-buttons">
        <button className="camera" onClick={toggleCamera}>
          <CameraAltIcon color={isCameraOn ? 'primary' : 'disabled'} />
        </button>
        <button className="mic" onClick={toggleMic}>
          <MicIcon color={isMicOn ? 'primary' : 'disabled'} />
        </button>
        <button
          className="end"
          onClick={() => {
            endCall();
            navigation('/channels');
            // 다시 채널 불러오도록 하기
            setSelectedId('');
          }}
        >
          <CallEndIcon />
        </button>
        <button onClick={debug}>debug</button>
      </div>
    </div>
  );
}
