import CameraAltIcon from '@mui/icons-material/CameraAlt';
import MicIcon from '@mui/icons-material/Mic';
import CallEndIcon from '@mui/icons-material/CallEnd';

export default function VideoChatRoom() {
  return (
    <div className="video-chat-wrapper">
      <div className="video-grid">
        <VideoBox />
        <VideoBox />
        <VideoBox />
        <VideoBox />
        <VideoBox />
        <VideoBox />
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
