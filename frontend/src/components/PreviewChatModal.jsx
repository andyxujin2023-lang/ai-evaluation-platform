import React, { useState, useEffect, useRef } from 'react'
import { X, Send, Image, Trash2, MessageSquare, Loader2 } from 'lucide-react'
import { previewApi } from '../api'

function PreviewChatModal({ isOpen, onClose }) {
  const [messages, setMessages] = useState([])
  const [inputText, setInputText] = useState('')
  const [conversationId, setConversationId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [pastedImages, setPastedImages] = useState([])
  const messagesEndRef = useRef(null)

  // 滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // 清空会话
  const clearConversation = async () => {
    if (conversationId) {
      try {
        await previewApi.clearConversation(conversationId)
      } catch (err) {
        console.error('Failed to clear conversation:', err)
      }
    }
    setMessages([])
    setConversationId(null)
    setPastedImages([])
  }

  // 处理粘贴图片
  const handlePaste = (e) => {
    const items = e.clipboardData?.items
    if (!items) return

    for (let item of items) {
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile()
        const reader = new FileReader()
        reader.onload = (event) => {
          setPastedImages(prev => [...prev, event.target.result])
        }
        reader.readAsDataURL(file)
      }
    }
  }

  // 移除粘贴的图片
  const removeImage = (index) => {
    setPastedImages(prev => prev.filter((_, i) => i !== index))
  }

  // 发送消息
  const sendMessage = async () => {
    if ((!inputText.trim() && pastedImages.length === 0) || loading) return

    const userMessage = inputText
    setInputText('')
    const imagesToSend = [...pastedImages]
    setPastedImages([])

    // 添加用户消息到界面
    const now = new Date().toISOString()
    setMessages(prev => [
      ...prev,
      { role: 'user', content: userMessage, timestamp: now, images: imagesToSend }
    ])

    setLoading(true)
    try {
      const res = await previewApi.chat({
        query: userMessage,
        conversation_id: conversationId,
        images: imagesToSend
      })

      setConversationId(res.data.conversation_id)
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: res.data.answer, timestamp: new Date().toISOString() }
      ])
    } catch (err) {
      console.error('Failed to send message:', err)
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `发送失败: ${err.response?.data?.detail || err.message || '未知错误'}`,
          timestamp: new Date().toISOString(),
          isError: true
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-800 rounded-xl w-full max-w-3xl h-[70vh] flex flex-col border border-dark-700">
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-dark-700">
          <div className="flex items-center gap-3">
            <MessageSquare className="w-5 h-5 text-primary-500" />
            <h2 className="text-xl font-bold text-white">智能体预览测试</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={clearConversation}
              className="p-2 text-dark-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
              title="清空会话"
            >
              <Trash2 className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-dark-400 hover:text-white hover:bg-dark-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 消息列表 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center text-dark-400">
              <div className="text-center">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>开始对话，测试智能体的响应</p>
                <p className="text-sm mt-2">支持粘贴图片（Ctrl+V）</p>
              </div>
            </div>
          ) : (
            messages.map((msg, index) => (
              <div
                key={index}
                className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] p-4 rounded-lg ${
                    msg.role === 'user'
                      ? 'bg-primary-600 text-white'
                      : msg.isError
                      ? 'bg-red-500/10 border border-red-500/30 text-red-300'
                      : 'bg-dark-700 text-white'
                  }`}
                >
                  {/* 显示用户发送的图片 */}
                  {msg.images && msg.images.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {msg.images.map((img, imgIndex) => (
                        <img
                          key={imgIndex}
                          src={img}
                          alt="Pasted"
                          className="max-w-32 max-h-32 rounded border border-dark-600"
                        />
                      ))}
                    </div>
                  )}
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  {msg.timestamp && (
                    <p className={`text-xs mt-2 ${msg.role === 'user' ? 'text-primary-200' : 'text-dark-400'}`}>
                      {new Date(msg.timestamp).toLocaleTimeString('zh-CN')}
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
          {loading && (
            <div className="flex gap-3 justify-start">
              <div className="bg-dark-700 text-white p-4 rounded-lg flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>正在思考...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* 粘贴的图片预览 */}
        {pastedImages.length > 0 && (
          <div className="px-6 py-3 border-t border-dark-700 flex flex-wrap gap-2">
            {pastedImages.map((img, index) => (
              <div key={index} className="relative">
                <img
                  src={img}
                  alt="Pasted"
                  className="w-20 h-20 object-cover rounded border border-dark-600"
                />
                <button
                  onClick={() => removeImage(index)}
                  className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full text-white text-xs flex items-center justify-center"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {/* 输入区域 */}
        <div className="p-4 border-t border-dark-700">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                placeholder="输入消息... (Enter发送, Shift+Enter换行)"
                className="w-full px-4 py-3 pr-12 bg-dark-700 border border-dark-600 rounded-lg text-white placeholder-dark-500 focus:outline-none focus:border-primary-500 resize-none"
                rows={1}
                style={{ minHeight: '48px', maxHeight: '120px' }}
              />
              <button
                className="absolute right-3 bottom-3 p-1 text-dark-400 hover:text-primary-400 transition-colors"
                title="粘贴图片 (Ctrl+V)"
              >
                <Image className="w-5 h-5" />
              </button>
            </div>
            <button
              onClick={sendMessage}
              disabled={loading || (!inputText.trim() && pastedImages.length === 0)}
              className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Send className="w-5 h-5" />
              发送
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PreviewChatModal
