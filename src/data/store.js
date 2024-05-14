import { create } from 'zustand';

// TODO: react-query 잘 사용해서 서버 측 변수 상태관리하기

const chatStoreInit = {
  chats: [], // 한 채널의 채팅들
  channels: [], // 채널 정보들
  selectedId: '0', // 선택된 채널의 id
  selectedChatRoom: undefined, // 선택된 채널의 정보
};

export const useChatStore = create((set) => ({
  ...chatStoreInit,

  setChats: (chats) => set(() => ({ chats })),
  setChannels: (channels) => set(() => ({ channels })),
  setSelectedId: (id) => set(() => ({ selectedId: id })),
  setSelectedChatRoom: (chatRoom) =>
    set(() => ({ selectedChatRoom: chatRoom })),
  reset: () => set(chatStoreInit),
}));
