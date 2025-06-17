'use client'
import { useCallback, memo, useMemo, useState } from 'react'
import { MessageSquarePlus, EllipsisVertical, Pin, PinOff, Copy, PencilLine, WandSparkles, Trash } from 'lucide-react'
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import Button from '@/components/Button'
import SearchBar from '@/components/SearchBar'
import { useMessageStore } from '@/store/chat'
import { useConversationStore } from '@/store/conversation'
import { useSettingStore } from '@/store/setting'
import { encodeToken } from '@/utils/signature'
import summaryTitle, { type RequestProps } from '@/utils/summaryTitle'
import { cn } from '@/utils'
import { customAlphabet } from 'nanoid'
import { entries, isNull } from 'lodash-es'

type Props = {
  id: string
  title: string
  pinned?: boolean
  isActive?: boolean
}

interface ConversationItem extends Conversation {
  id: string
}

const nanoid = customAlphabet('1234567890abcdefghijklmnopqrstuvwxyz', 12)

function search(keyword: string, data: Record<string, Conversation>): Record<string, Conversation> {
  const results: Record<string, Conversation> = {}
  const regex = new RegExp(keyword.trim(), 'gi')
  for (const [id, item] of entries(data)) {
    if (regex.test(item.title) || regex.test(item.systemInstruction)) {
      results[id] = item
    }
    item.messages.forEach((message) => {
      message.parts.forEach((part) => {
        if (part.text && regex.test(part.text)) {
          results[id] = item
        }
      })
    })
  }
  return results
}

function ConversationItem(props: Props) {
  const { id, title, pinned = false, isActive = false } = props
  const { pin, unpin, copy, remove } = useConversationStore()
  const { setTitle } = useMessageStore()
  const [customTitle, setCustomTitle] = useState<string>(title)
  const [editTitleMode, setEditTitleMode] = useState<boolean>(false)
  const conversationTitle = useMemo(() => (title === '' ? 'Chat Anything' : title), [title])

  const handleSelect = useCallback((id: string) => {
    const { currentId, query, addOrUpdate, setCurrentId } = useConversationStore.getState()
    const { backup, restore } = useMessageStore.getState()
    const oldConversation = backup()
    addOrUpdate(currentId, oldConversation)

    const newConversation = query(id)
    setCurrentId(id)
    restore(newConversation)
  }, [])

  const editTitle = useCallback(
    (text: string) => {
      setTitle(text)
      setEditTitleMode(false)
    },
    [setTitle],
  )

  const handleSummaryTitle = useCallback(async (id: string) => {
    const { lang, apiKey, apiProxy, model, password } = useSettingStore.getState()
    const { currentId, query, addOrUpdate } = useConversationStore.getState()
    const { messages, systemInstruction, setTitle } = useMessageStore.getState()
    const conversation = query(id)
    const config: RequestProps = {
      apiKey,
      model,
      lang,
      messages: id === currentId ? messages : conversation.messages,
      systemRole: id === currentId ? systemInstruction : conversation.systemInstruction,
    }
    if (apiKey !== '') {
      if (apiProxy) config.baseUrl = apiProxy
    } else {
      config.apiKey = encodeToken(password)
      config.baseUrl = '/api/google'
    }
    const readableStream = await summaryTitle(config)
    let content = ''
    const reader = readableStream.getReader()
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      content += new TextDecoder().decode(value)
      addOrUpdate(id, { ...conversation, title: content })
    }
    if (id === currentId) setTitle(content)
  }, [])

  return (
    <div
      className={cn(
        'inline-flex h-12 w-full cursor-pointer justify-between rounded-lg px-3 transition-all duration-200',
        'hover:bg-[#e6e6cc]',
        isActive ? 'bg-[#e6e6cc] font-medium shadow-sm' : '',
        editTitleMode ? 'bg-transparent hover:bg-transparent' : '',
      )}
      onClick={() => handleSelect(id)}
    >
      {editTitleMode ? (
        <div className="relative w-full">
          <Input
            className="my-1.5 h-9 bg-[#f5f5dc]"
            defaultValue={conversationTitle}
            onChange={(ev) => setCustomTitle(ev.target.value)}
          />
          <Button
            className="absolute right-1 top-2.5 h-6 w-6 hover:bg-[#e6e6cc]"
            size="icon"
            variant="ghost"
            title="Save"
            onClick={() => editTitle(customTitle)}
          >
            <PencilLine className="text-[#2d2d2d]" />
          </Button>
        </div>
      ) : (
        <>
          <span className="truncate text-sm leading-12 text-[#2d2d2d]" title={conversationTitle}>
            {conversationTitle}
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger>
              <EllipsisVertical className="h-6 w-6 rounded-sm p-1 hover:bg-[#e6e6cc] text-[#2d2d2d]" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="bg-[#f5f5dc] border-[#e6e6cc]"
              onClick={(ev) => {
                ev.stopPropagation()
                ev.preventDefault()
              }}
            >
              {id !== 'default' ? (
                <DropdownMenuItem className="hover:bg-[#e6e6cc]" onClick={() => (pinned ? unpin(id) : pin(id))}>
                  {pinned ? (
                    <>
                      <PinOff className="text-[#2d2d2d]" />
                      <span className="text-[#2d2d2d]">Unpin</span>
                    </>
                  ) : (
                    <>
                      <Pin className="text-[#2d2d2d]" />
                      <span className="text-[#2d2d2d]">Pin</span>
                    </>
                  )}
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuItem className="hover:bg-[#e6e6cc]" onClick={() => copy(id)}>
                <Copy className="text-[#2d2d2d]" />
                <span className="text-[#2d2d2d]">New Copy</span>
              </DropdownMenuItem>
              {id !== 'default' ? (
                <DropdownMenuGroup>
                  <DropdownMenuSeparator className="bg-[#e6e6cc]" />
                  <DropdownMenuItem className="hover:bg-[#e6e6cc]" onClick={() => handleSummaryTitle(id)}>
                    <WandSparkles className="text-[#2d2d2d]" />
                    <span className="text-[#2d2d2d]">AI Rename</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="hover:bg-[#e6e6cc]" onClick={() => setEditTitleMode(true)}>
                    <PencilLine className="text-[#2d2d2d]" />
                    <span className="text-[#2d2d2d]">Rename</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-red-500 hover:bg-[#e6e6cc]" onClick={() => remove(id)}>
                    <Trash />
                    <span>Delete</span>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      )}
    </div>
  )
}

function AppSidebar() {
  const conversationList = useConversationStore((state) => state.conversationList)
  const pinned = useConversationStore((state) => state.pinned)
  const currentId = useConversationStore((state) => state.currentId)
  const [conversations, setConversations] = useState<Record<string, Conversation> | null>(null)
  const [list, pinnedList] = useMemo(() => {
    const list: ConversationItem[] = []
    const pinnedList: ConversationItem[] = []
    const sources = isNull(conversations) ? conversationList : conversations
    for (const [id, conversation] of entries(sources)) {
      if (id !== 'default') {
        if (pinned.includes(id)) {
          pinnedList.push({ id, ...conversation })
        } else {
          list.push({ id, ...conversation })
        }
      }
    }
    return [list, pinnedList]
  }, [conversationList, conversations, pinned])

  const newConversation = useCallback(() => {
    const { currentId, addOrUpdate, setCurrentId } = useConversationStore.getState()
    const { backup, restore } = useMessageStore.getState()
    const oldConversation = backup()
    addOrUpdate(currentId, oldConversation)

    const id = nanoid()
    const newConversation: Conversation = {
      title: '',
      messages: [],
      summary: { ids: [], content: '' },
      systemInstruction: '',
      chatLayout: 'doc',
    }
    setCurrentId(id)
    addOrUpdate(id, newConversation)
    restore(newConversation)
  }, [])

  const handleSearch = useCallback(
    (keyword: string) => {
      const result = search(keyword, conversationList)
      setConversations(result)
    },
    [conversationList],
  )

  const handleClearKeyword = useCallback(() => {
    setConversations(null)
  }, [])

  return (
    <Sidebar className="bg-[#f5f5dc]">
      <SidebarHeader className="border-b border-[#e6e6cc]">
        <div className="flex justify-between p-3 pb-2">
          <span className="text-xl font-bold text-[#2d2d2d]">AiVenger</span>
          <Button
            className="h-9 w-9 rounded-full hover:bg-[#e6e6cc] transition-all duration-200"
            variant="ghost"
            size="icon"
            title="New Conversation"
            onClick={() => newConversation()}
          >
            <MessageSquarePlus className="text-[#2d2d2d]" />
          </Button>
        </div>
        <div className="px-2 pb-2">
          <SearchBar onSearch={handleSearch} onClear={handleClearKeyword} />
        </div>
      </SidebarHeader>
      <SidebarContent className="gap-1 p-2">
        <SidebarGroup className="py-1">
          <ConversationItem
            id="default"
            title="Default Conversation"
            isActive={currentId === 'default'}
          />
        </SidebarGroup>

        {pinnedList.length > 0 && (
          <SidebarGroup className="py-1">
            <SidebarGroupLabel className="text-sm font-medium text-[#2d2d2d] px-2">
              Pinned
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem className="space-y-1">
                  {pinnedList.map((item) => (
                    <ConversationItem
                      key={item.id}
                      id={item.id}
                      title={item.title}
                      isActive={currentId === item.id}
                      pinned
                    />
                  ))}
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {list.length > 0 && (
          <SidebarGroup className="py-1">
            <SidebarGroupLabel className="text-sm font-medium text-[#2d2d2d] px-2">
              Conversation List
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem className="space-y-1">
                  {list.map((item) => (
                    <ConversationItem
                      key={item.id}
                      id={item.id}
                      title={item.title}
                      isActive={currentId === item.id}
                    />
                  ))}
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  )
}

export default memo(AppSidebar)
