'use client'
import { memo, useState, useEffect, useRef, useCallback } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'

type Props = {
  content: string
  isEditing: boolean
  onChange: (content: string) => void
  onCancel: () => void
}

function EditableArea({ content, isEditing, onChange, onCancel }: Props) {
  const contentRef = useRef<HTMLTextAreaElement>(null)
  const [contentHeight, setContentHeight] = useState<number>(80)

  const handleChange = useCallback(() => {
    if (contentRef.current) {
      onChange(contentRef.current.value)
    }
  }, [onChange])

  const handleCancel = useCallback(() => {
    onCancel()
  }, [onCancel])

  useEffect(() => {
    if (isEditing && contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight + 14)
      contentRef.current.focus()
    }
  }, [isEditing])

  if (!isEditing) return null

  return (
    <>
      <Textarea
        ref={contentRef}
        defaultValue={content}
        className="chat-content max-h-[320px] resize-none"
        style={{ height: `${contentHeight}px` }}
      />
      <div className="mt-2 flex justify-end gap-2">
        <Button className="h-8 px-4" variant="secondary" size="sm" onClick={handleCancel}>
          Cancel
        </Button>
        <Button className="h-8 px-4" size="sm" onClick={handleChange}>
          Save
        </Button>
      </div>
    </>
  )
}

export default memo(EditableArea)
