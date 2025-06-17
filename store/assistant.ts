import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { customAlphabet } from 'nanoid'
import { shuffleArray } from '@/utils/common'
import dayjs from 'dayjs'


const nanoid = customAlphabet('1234567890abcdefghijklmnopqrstuvwxyz', 12)

// Define the default assistant
const defaultAssistant: AssistantDetail = {
  identifier: 'default-assistant',
  schemaVersion: 1,
  meta: {
    title: 'Default Assistant',
    description: 'A general-purpose assistant to help with various tasks.',
    avatar: '🤖',
    tags: ['General', 'Helper']
  },
  config: {
    systemRole: 'You are a helpful assistant ready to help with any task.'
  },
  author: 'System',
  homepage: '',
  createAt: dayjs().format('YYYY-MM-DD')
}

type AssistantStore = {
  assistants: AssistantDetail[]
  favorites: string[]
  tags: string[]
  recommendation: AssistantDetail[]
  cachedTime: number
  cachedLang: string
  update: (assistants: AssistantDetail[]) => void
  addAssistant: (assistant: AssistantDetail) => void
  updateAssistant: (id: string, assistant: AssistantDetail) => void
  removeAssistant: (id: string) => void
  addFavorite: (id: string) => void
  removeFavorite: (id: string) => void
  updateTags: (tags: string[]) => void
  recommend: (amount: number) => void
  setCachedTime: (timestamp: number) => void
  setCachedLang: (lang: string) => void
}

export const useAssistantStore = create(
  persist<AssistantStore>(
    (set, get) => ({
      assistants: [],
      favorites: [],
      tags: [],
      recommendation: [],
      cachedTime: 0,
      cachedLang: '',
      
      update: (assistantList) => {
        set((state) => {
          const currentAssistants = [...state.assistants]
          assistantList.forEach((item) => {
            const existingIndex = currentAssistants.findIndex(
              (existing) => existing.identifier === item.identifier
            )
            if (existingIndex > -1) {
              currentAssistants[existingIndex] = item
            } else {
              currentAssistants.unshift(item)
            }
          })
          return { assistants: currentAssistants }
        })
      },

      addAssistant: (assistant) => {
        set((state) => {
          const newAssistant = {
            ...assistant,
            identifier: assistant.identifier || nanoid(),
            createAt: dayjs().format('YYYY-MM-DD')
          }
          return { assistants: [newAssistant, ...state.assistants] }
        })
      },

      updateAssistant: (id, assistant) => {
        set((state) => ({
          assistants: state.assistants.map((a) => 
            a.identifier === id ? { ...assistant, identifier: id } : a
          )
        }))
      },

      removeAssistant: (id) => {
        set((state) => ({
          assistants: state.assistants.filter((a) => a.identifier !== id)
        }))
      },

      addFavorite: (id) => {
        set((state) => ({
          favorites: state.favorites.includes(id) 
            ? state.favorites 
            : [...state.favorites, id]
        }))
      },

      removeFavorite: (id) => {
        set((state) => ({
          favorites: state.favorites.filter((item) => item !== id)
        }))
      },

      updateTags: (tags) => set({ tags }),

      recommend: (amount = 1) => {
        set((state) => ({
          recommendation: shuffleArray(
            state.assistants.length > 0 
              ? state.assistants 
              : [defaultAssistant]
          ).slice(0, amount)
        }))
      },

      setCachedTime: (timestamp) => set({ cachedTime: timestamp }),
      setCachedLang: (lang) => set({ cachedLang: lang })
    }),
    {
      name: 'assistant-store',
      version: 1,
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name)
          return str ? Promise.resolve(JSON.parse(str)) : Promise.resolve(null)
        },
        setItem: (name, value) => {
          localStorage.setItem(name, JSON.stringify(value))
          return Promise.resolve()
        },
        removeItem: (name) => {
          localStorage.removeItem(name)
          return Promise.resolve()
        },
      },
    }
  )
)

// Export the default assistant for use in other components
export { defaultAssistant }
