import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

// TODO: react-query 잘 사용해서 서버 측 변수 상태관리하기

const chatStoreInit = {
  nickName: '', // 닉네임
  userId: 0, // 유저 id
  chats: [], // 한 채널의 채팅들
  channels: [], // 채널 정보들
  selectedId: '', // 선택된 채널의 id
  selectedChatRoom: undefined, // 선택된 채널의 정보
};

export const useChatStore = create(
  persist(
    (set) => ({
      ...chatStoreInit,

      setNickName: (nickName) => set(() => ({ nickName })),
      setUserId: (id) => set(() => ({ userId: id })),

      setChats: (chats) => set(() => ({ chats })),
      setChannels: (channels) => set(() => ({ channels })),
      setSelectedId: (id) => set(() => ({ selectedId: id })),
      setSelectedChatRoom: (chatRoom) =>
        set(() => ({ selectedChatRoom: chatRoom })),
      reset: () => set(chatStoreInit),
    }),
    {
      name: 'chatStorage',
      storage: createJSONStorage(() => sessionStorage),

      // nickName 만 storage 관리
      partialize: (state) => ({
        nickName: state.nickName,
        userId: state.userId,
      }),
    },
  ),
);

export const useTempStore = create((set) => ({
  triggered: true,
  trigger: () => set((state) => ({ triggered: !state.triggered })),
}));
