import { useNavigate } from 'react-router-dom';
import { useChatStore } from '../data/store';
import { removeCookie } from '../utils/cookie';

export const useEject = () => {
  const navigation = useNavigate();
  const resetStore = useChatStore((state) => state.reset);
  const clearChatStorage = useChatStore.persist.clearStorage;

  return () => {
    resetStore(); // state 초기화
    clearChatStorage(); // 세션 스토리지 삭제
    removeCookie('userId'); // 쿠키 삭제

    navigation('/users'); // 로그인 화면으로 이동
  };
};
