import { create } from 'zustand'
import { persist, type StorageValue } from 'zustand/middleware'
import storage from '@/utils/Storage'
import { omitBy, isFunction, isNull } from 'lodash-es'

interface SettingStore extends Setting {
  update: (values: Partial<Setting>) => void
  setIsProtected: (isProtected: boolean) => void
}


export const useSettingStore = create(
  persist<SettingStore>(
    (set, get) => ({
      password: '',
      apiKey: '',
      apiProxy: 'https://generativelanguage.googleapis.com',
      uploadProxy: 'https://generativelanguage.googleapis.com',
      model: 'gemini-1.5-pro',
      sttLang: '',
      ttsLang: '',
      ttsVoice: '',
      lang: '',
      isProtected: false,
      talkMode: 'chat',
      maxHistoryLength: 20,
      topP: 0.6,
      topK: 50,
      temperature: 0,
      maxOutputTokens: 8192,
      safety: 'none',
      autoStopRecord: false,
      sidebarState: 'collapsed',
      update: (values) => set((state) => ({ ...state, ...values })),
      setIsProtected: (isProtected) => set({ isProtected }),
    }),
    {
      name: 'settingStore',
      version: 1,
      storage: {
        getItem: async (key: string) => {
          const store = await storage.getItem<StorageValue<SettingStore>>(key)
          /**
           * Since the data storage structure has changed since version 0.13.0,
           * the logic here is used to migrate the data content of the old version.
           */
          if (isNull(store)) {
            const state: Record<string, any> = {}
            const oldState: string[] = [
              'password',
              'apiKey',
              'apiProxy',
              'uploadProxy',
              'model',
              'sttLang',
              'ttsLang',
              'ttsVoice',
              'lang',
              'talkMode',
              'safety',
              'maxHistoryLength',
              'topP',
              'topK',
              'temperature',
              'maxOutputTokens',
              'isProtected',
              'autoStopRecord',
            ]
            for await (const name of oldState) {
              const data = await storage.getItem(name)
              if (data) state[name] = data
              await storage.removeItem(name)
            }
            return { state, version: 1 } as StorageValue<SettingStore>
          }
          return store
        },
        setItem: async (key: string, store: StorageValue<SettingStore>) => {
          return await storage.setItem(key, {
            state: omitBy(store.state, (item) => isFunction(item)),
            version: store.version,
          })
        },
        removeItem: async (key: string) => await storage.removeItem(key),
      },
    },
  ),
)
