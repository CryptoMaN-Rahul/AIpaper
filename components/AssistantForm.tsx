'use client'
import { useCallback, memo, useMemo, useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Sparkles } from 'lucide-react'
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import Button from '@/components/Button'
import { useAssistantStore } from '@/store/assistant'
import { useSettingStore } from '@/store/setting'
import { encodeToken } from '@/utils/signature'
import optimizePrompt, { type RequestProps } from '@/utils/optimizePrompt'
import { customAlphabet } from 'nanoid'
import dayjs from 'dayjs'
import { isFunction, isUndefined } from 'lodash-es'

// ============= Types and Constants =============
/**
 * Possible states after form changes
 */
type ChangeStatus = 'new' | 'edit' | 'clear'

/**
 * Component props interface
 */
type Props = {
  data?: AssistantDetail
  onChange?: (status: ChangeStatus) => void
}

/**
 * Generate random ID for new assistants
 */
const nanoid = customAlphabet('1234567890abcdefghijklmnopqrstuvwxyz', 12)

/**
 * Default schema for new assistants
 */
const assistantSchema: AssistantDetail = {
  author: '',
  createAt: dayjs().format('YYYY-MM-DD'),
  homepage: '',
  identifier: '',
  meta: {
    avatar: '🤖',
    tags: [],
    title: '',
    description: '',
  },
  config: {
    systemRole: '',
  },
  schemaVersion: 1,
}

/**
 * Zod validation schema for form fields
 */
const formSchema = z.object({
  id: z.string(),
  title: z.string().min(1, 'Title is required').max(20, 'Title must be less than 20 characters'),
  description: z.string().min(1, 'Description is required').max(120, 'Description must be less than 120 characters'),
  systemInstruction: z.string().min(1, 'System instruction is required'),
})

// ============= Main Component =============
function AssistantForm(props: Props) {
  const { data, onChange } = props
  const { addAssistant, updateAssistant } = useAssistantStore()

  // Determine if we're in edit mode
  const editMode = useMemo(() => !isUndefined(data), [data])

  // ============= Form Setup =============
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      id: '',
      title: '',
      description: '',
      systemInstruction: '',
    },
  })

  // ============= Form Handlers =============
  /**
   * Reset form to initial state
   */
  const reset = useCallback(
    (status: ChangeStatus) => {
      form.clearErrors()
      form.reset({
        id: '',
        title: '',
        description: '',
        systemInstruction: '',
      })
      if (isFunction(onChange)) onChange(status)
    },
    [form, onChange],
  )

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(
    (values: z.infer<typeof formSchema>) => {
      // Create new assistant object
      const assistant: AssistantDetail = {
        ...assistantSchema,
        identifier: values.id || nanoid(),
        meta: {
          ...assistantSchema.meta,
          title: values.title,
          description: values.description,
        },
        config: {
          systemRole: values.systemInstruction,
        },
      }

      // Update or add assistant based on mode
      if (editMode) {
        updateAssistant(values.id, assistant)
        reset('edit')
      } else {
        addAssistant(assistant)
        reset('new')
      }
    },
    [addAssistant, editMode, reset, updateAssistant],
  )

  /**
   * Optimize the assistant prompt using AI
   */
  const optimizeAssistantPrompt = useCallback(async () => {
    const content = form.getValues('systemInstruction')
    if (content === '') return false

    // Get settings for API configuration
    const { apiKey, apiProxy, model, password } = useSettingStore.getState()
    const config: RequestProps = {
      apiKey,
      model,
      content,
    }

    // Configure API endpoint based on settings
    if (apiKey !== '') {
      if (apiProxy) config.baseUrl = apiProxy
    } else {
      config.apiKey = encodeToken(password)
      config.baseUrl = '/api/google'
    }

    // Process the optimization stream
    const readableStream = await optimizePrompt(config)
    let systemInstruction = ''
    const reader = readableStream.getReader()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      systemInstruction += new TextDecoder().decode(value)
      form.setValue('systemInstruction', systemInstruction)
    }
  }, [form])

  /**
   * Initialize form data when editing existing assistant
   */
  const initData = useCallback(async () => {
    if (data) {
      form.reset({
        id: data.identifier,
        title: data.meta.title,
        description: data.meta.description,
        systemInstruction: data.config?.systemRole || '',
      })
    }
  }, [data, form])

  // ============= Effects =============
  /**
   * Load initial data when editing
   */
  useEffect(() => {
    initData()
  }, [initData, data])

  // ============= Render =============
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="mt-1 space-y-3 max-sm:pb-2">
        {/* Basic Information Section */}
        <h3 className="font-semibold">基本信息</h3>

        {/* Title Field */}
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem className="relative">
              <FormControl>
                <Input
                  className="w-1/2"
                  placeholder="助手名称"
                  {...field}
                />
              </FormControl>
              <FormMessage className="absolute" />
            </FormItem>
          )}
        />

        {/* Description Field */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem className="relative">
              <FormControl>
                <Input
                  placeholder="助手描述"
                  {...field}
                />
              </FormControl>
              <FormMessage className="absolute" />
            </FormItem>
          )}
        />

        {/* System Instructions Section */}
        <h3 className="font-semibold">角色设定</h3>

        {/* System Instruction Field */}
        <FormField
          control={form.control}
          name="systemInstruction"
          render={({ field }) => (
            <FormItem className="relative">
              <FormControl>
                <Textarea
                  className="h-[218px] whitespace-pre-wrap max-sm:h-[210px]"
                  placeholder="系统指令"
                  {...field}
                />
              </FormControl>
              <FormMessage className="absolute" />
            </FormItem>
          )}
        />

        {/* Form Actions */}
        <div className="mt-2 flex justify-between gap-2">
          {/* Optimize Button */}
          <Button
            title="优化提示词"
            variant="secondary"
            size="icon"
            type="button"
            onClick={() => optimizeAssistantPrompt()}
          >
            <Sparkles className="h-5 w-5" />
          </Button>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              className="max-sm:flex-1"
              type="reset"
              variant="outline"
              onClick={() => reset('clear')}
            >
              取消
            </Button>
            <Button
              className="max-sm:flex-1"
              type="submit"
            >
              {editMode ? '更新助手' : '添加助手'}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  )
}

export default memo(AssistantForm)
