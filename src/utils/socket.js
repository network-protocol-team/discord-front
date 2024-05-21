/**
 * signaling 서버로 publish 하는 함수
 *
 * 사용법: 각 소켓에 맞춘 함수를 정의한 후 사용한다.
 * ex) const sendToVideoServer = sendToServer(videoSocket);
 */
export const sendToServer =
  (socketRef) =>
  (destination, body, headers = {}) => {
    socketRef.current.publish({
      destination,
      body: JSON.stringify(body),
      headers,
    });
  };
