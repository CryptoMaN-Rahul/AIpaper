'use client'
import { useState, useCallback, useLayoutEffect, useEffect, memo, useMemo } from 'react'
import { EllipsisVertical, Heart } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardHeader, CardContent, CardFooter, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import ResponsiveDialog from '@/components/ResponsiveDialog'
import SearchBar from '@/components/SearchBar'
import AssistantForm from '@/components/AssistantForm'
import Button from '@/components/Button'
import { useMessageStore } from '@/store/chat'
import { useAssistantStore } from '@/store/assistant'

// ============= Types and Interfaces =============
type AssistantProps = {
  open: boolean
  onClose: () => void
  onLoaded: () => void
}

// ============= Default Configuration =============
/**
 * Default assistant configuration that serves as the initial state
 * and fallback when no custom assistants are present
 */
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
  createAt: new Date().toISOString()
}

const defaultTags = ['General', 'Helper']

// ============= Utility Functions =============
/**
 * Search through assistants based on keyword
 * @param keyword - Search term
 * @param data - Array of assistants to search through
 */
function search(keyword: string, data: AssistantDetail[]): AssistantDetail[] {
  const results: AssistantDetail[] = []
  const regex = new RegExp(keyword.trim(), 'gi')
  data.forEach((item) => {
    if (
      item.meta.tags.includes(keyword) ||
      regex.test(item.meta.title) ||
      regex.test(item.meta.description)
    ) {
      results.push(item)
    }
  })
  return results
}

/**
 * Filter assistants by tag
 * @param data - Array of assistants
 * @param tag - Tag to filter by
 */
function filterDataByTag(data: AssistantDetail[], tag: string): AssistantDetail[] {
  return tag !== 'all' ? data.filter((item) => item.meta.tags.includes(tag)) : data
}

// ============= Main Component =============
function AssistantMarket(props: AssistantProps) {
  const { open, onClose, onLoaded } = props

  // ============= Store Hooks =============
  const {
    update: updateAssistants,
    removeAssistant,
    addFavorite,
    removeFavorite,
    updateTags
  } = useAssistantStore()

  const assistants = useAssistantStore((state) => state.assistants)
  const favorites = useAssistantStore((state) => state.favorites)

  // ============= Local State =============
  // Initialize assistant list with stored assistants or default
  const [assistantList, setAssistantList] = useState<AssistantDetail[]>(() => {
    const stored = assistants
    return stored.length > 0 ? stored : [defaultAssistant]
  })

  const [tagList, setTagList] = useState<string[]>(defaultTags)
  const [currentTag, setCurrentTag] = useState<string>('all')
  const [freezeSelection, setFreezeSelection] = useState<boolean>(false)
  const [currentTab, setCurrentTab] = useState<string>('list')
  const [data, setData] = useState<AssistantDetail>()

  // ============= Memoized Values =============
  // Filter favorite assistants
  const favoriteList = useMemo(() => {
    return assistantList.filter((item) => favorites.includes(item.identifier))
  }, [assistantList, favorites])

  // ============= Callback Functions =============
  /**
   * Reset assistant list to current filter state
   */
  const handleClear = useCallback(() => {
    setAssistantList(filterDataByTag(
      assistants.length > 0 ? assistants : [defaultAssistant],
      currentTag
    ))
  }, [assistants, currentTag])

  /**
   * Handle dialog close and reset states
   */
  const handleClose = useCallback(() => {
    onClose()
    setCurrentTag('all')
    handleClear()
  }, [onClose, handleClear])

  /**
   * Handle assistant selection and instruction setting
   */
  const handleSelect = useCallback(
    async (assistant: AssistantDetail) => {
      if (freezeSelection) return false
      handleClose()
      const { instruction, clear: clearMessage } = useMessageStore.getState()
      clearMessage()
      instruction(assistant.config.systemRole, assistant.meta.title)
    },
    [freezeSelection, handleClose],
  )

  /**
   * Handle search functionality
   */
  const handleSearch = useCallback(
    (keyword: string) => {
      const result = search(
        keyword,
        filterDataByTag(
          assistants.length > 0 ? assistants : [defaultAssistant],
          currentTag
        )
      )
      setAssistantList(result)
    },
    [currentTag, assistants],
  )

  /**
   * Handle tag selection and filtering
   */
  const handleSelectTag = useCallback(
    (value: string) => {
      setCurrentTag(value)
      setAssistantList(filterDataByTag(
        assistants.length > 0 ? assistants : [defaultAssistant],
        value
      ))
    },
    [assistants],
  )

  /**
   * Handle tag list open/close states
   */
  const handleTagListOpenChange = useCallback((open: boolean) => {
    if (open) {
      setFreezeSelection(open)
    } else {
      setTimeout(() => {
        setFreezeSelection(open)
      }, 350)
    }
  }, [])

  // ============= Effects =============
  /**
   * Initialize assistants and tags
   */
  useLayoutEffect(() => {
    if (assistants.length === 0) {
      updateAssistants([defaultAssistant])
      setAssistantList([defaultAssistant])
    } else {
      setAssistantList(assistants)
    }
    setTagList(defaultTags)
    updateTags(defaultTags)
    onLoaded()
  }, [updateAssistants, updateTags, onLoaded, assistants])

  /**
   * Keep UI in sync with store changes
   */
  useEffect(() => {
    setAssistantList(assistants.length > 0 ? assistants : [defaultAssistant])
  }, [assistants])

  // ============= Render Helper Functions =============
  /**
   * Render assistant cards
   */
  const renderAssistantList = (assistants: AssistantDetail[]) => {
    return assistants.map((assistant) => (
      <Card
        key={assistant.identifier}
        className="cursor-pointer transition-colors hover:drop-shadow-md dark:hover:border-white/80"
        onClick={() => handleSelect(assistant)}
      >
        <CardHeader className="p-4 pb-2">
          <CardTitle className="flex justify-between text-base">
            <div className="flex w-full">
              <Avatar className="mr-1 h-6 w-6">
                <AvatarFallback className="bg-transparent">
                  {assistant.meta.avatar}
                </AvatarFallback>
              </Avatar>
              <span className="flex-1 truncate font-medium" title={assistant.meta.title}>
                {assistant.meta.title}
              </span>
              <div className="inline-flex gap-1">
                <Button
                  className="h-6 w-6"
                  size="icon"
                  variant="ghost"
                  onClick={(ev) => {
                    ev.stopPropagation()
                    ev.preventDefault()
                    if (favorites.includes(assistant.identifier)) {
                      removeFavorite(assistant.identifier)
                    } else {
                      addFavorite(assistant.identifier)
                    }
                  }}
                >
                  <Heart className={favorites.includes(assistant.identifier) ? 'text-red-400' : ''} />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger>
                    <EllipsisVertical
                      className="h-5 w-5"
                      onClick={(ev) => {
                        ev.stopPropagation()
                        ev.preventDefault()
                      }}
                    />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem
                      onSelect={(ev) => {
                        ev.stopPropagation()
                        ev.preventDefault()
                        setData(assistant)
                        setCurrentTab('custom')
                      }}
                    >
                      Edit
                    </DropdownMenuItem>
                    {assistant.author === '' && (
                      <DropdownMenuItem
                        className="text-red-500"
                        onSelect={(ev) => {
                          ev.stopPropagation()
                          ev.preventDefault()
                          removeFavorite(assistant.identifier)
                          removeAssistant(assistant.identifier)
                        }}
                      >
                        Delete
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-line-clamp-2 mb-2 h-10 px-4 text-sm">
          {assistant.meta.description}
        </CardContent>
        <CardFooter className="flex justify-between p-3 px-4 pt-0 text-sm">
          <span>{assistant.createAt}</span>
          {assistant.author && (
            <span className="text-muted-foreground">@{assistant.author}</span>
          )}
        </CardFooter>
      </Card>
    ))
  }

  // ============= Main Render =============
  return (
    <ResponsiveDialog
      className="max-h-[95vh] max-w-screen-md"
      open={open}
      onClose={handleClose}
      title={
        <>
          Assistant Market
          <small>{`Total Assistants: ${assistantList.length}`}</small>
        </>
      }
      description="Browse and manage your assistants"
    >
      <Tabs value={currentTab} onValueChange={(value) => setCurrentTab(value)}>
        <TabsList className="mx-auto grid w-full grid-cols-3">
          <TabsTrigger value="list">Assistant List</TabsTrigger>
          <TabsTrigger value="favorite">Favorite List</TabsTrigger>
          <TabsTrigger value="custom">Custom Assistant</TabsTrigger>
        </TabsList>

        {/* List Tab */}
        <TabsContent value="list">
          <div className="flex gap-2 pb-2 pt-1">
            <Select defaultValue="all" onValueChange={handleSelectTag} onOpenChange={handleTagListOpenChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {tagList.map((tag) => (
                  <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <SearchBar onSearch={handleSearch} onClear={handleClear} />
          </div>
          <ScrollArea className="h-[400px] w-full scroll-smooth">
            <div className="grid grid-cols-2 gap-2 max-sm:grid-cols-1">
              {renderAssistantList(assistantList)}
            </div>
            <ScrollBar orientation="vertical" />
          </ScrollArea>
        </TabsContent>

        {/* Favorites Tab */}
        <TabsContent value="favorite">
          <ScrollArea className="h-[452px] w-full scroll-smooth">
            <div className="grid grid-cols-2 gap-2 max-sm:grid-cols-1">
              {renderAssistantList(favoriteList)}
            </div>
            <ScrollBar orientation="vertical" />
          </ScrollArea>
        </TabsContent>

        {/* Custom Tab */}
        <TabsContent value="custom">
          <ScrollArea className="h-[452px] w-full scroll-smooth">
            <AssistantForm
              data={data}
              onChange={(status) => {
                setData(undefined)
                if (status !== 'clear') {
                  setCurrentTab('list')
                }
              }}
            />
            <ScrollBar orientation="vertical" />
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </ResponsiveDialog>
  )
}

export default memo(AssistantMarket)
