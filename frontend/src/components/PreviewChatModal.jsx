import React, { useState, useEffect, useRef } from 'react'
import { X, Send, Image, Trash2, MessageSquare, Loader2, Bot, User, ChevronLeft, ChevronRight, CheckCircle2, AlertCircle } from 'lucide-react'
import { previewApi } from '../api'

function PreviewChatModal({ isOpen, onClose }) {
  const [messages, setMessages] = useState([])
  const [inputText, setInputText] = useState('')
  const [conversationId, setConversationId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [pastedImages, setPastedImages] = useState([])
  const messagesContainerRef = useRef(null)

  // 分析面板状态
  const [panelOpen, setPanelOpen] = useState(false)
  const [standardAnswer, setStandardAnswer] = useState('')
  const [enableAnalysis, setEnableAnalysis] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState(null)

  // 滚动到底部
  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      const container = messagesContainerRef.current
      container.scrollTop = container.scrollHeight
    }
  }

  useEffect(() => {
    // 每次消息更新时立即滚动到底部
    setTimeout(scrollToBottom, 50)
  }, [messages])

  // 打开弹窗时也滚动到底部
  useEffect(() => {
    if (isOpen && messages.length > 0) {
      setTimeout(scrollToBottom, 100)
    }
  }, [isOpen, messages.length])

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
    setAnalysisResult(null)
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

  // 分析AI回答
  const analyzeAnswer = async (question, aiAnswer) => {
    if (!enableAnalysis || !standardAnswer.trim()) {
      return
    }

    setAnalyzing(true)
    try {
      const res = await previewApi.analyze({
        question,
        standard_answer: standardAnswer,
        ai_answer: aiAnswer
      })
      setAnalysisResult(res.data)
    } catch (err) {
      console.error('Failed to analyze:', err)
      setAnalysisResult({
        accuracy: 0,
        completeness: 0,
        actionability: 0,
        consistency: 0,
        issues: `分析失败: ${err.response?.data?.detail || err.message}`,
        total_score: 0
      })
    } finally {
      setAnalyzing(false)
    }
  }

  // 发送消息
  const sendMessage = async () => {
    if ((!inputText.trim() && pastedImages.length === 0) || loading) return

    const userMessage = inputText
    setInputText('')
    const imagesToSend = [...pastedImages]
    setPastedImages([])
    setAnalysisResult(null)

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

      const aiAnswer = res.data.answer
      setConversationId(res.data.conversation_id)
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: aiAnswer, timestamp: new Date().toISOString() }
      ])

      // 如果启用了分析，自动分析回答
      if (enableAnalysis && standardAnswer.trim()) {
        await analyzeAnswer(userMessage, aiAnswer)
      }
    } catch (err) {
      console.error('Failed to send message:', err)
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `发送失败: ${err.response?.data?.detail || err.message}`,
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

  // 自动调整textarea高度
  const adjustTextareaHeight = (e) => {
    const target = e.target
    target.style.height = 'auto'
    target.style.height = Math.min(target.scrollHeight, 160) + 'px'
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-800 rounded-2xl w-full max-w-6xl h-[85vh] flex border border-dark-700 shadow-2xl overflow-hidden relative">
        {/* 左侧聊天区域 */}
        <div className={`flex flex-col ${panelOpen ? 'flex-1' : 'flex-1'}`}>
          {/* 头部 */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-dark-700 bg-dark-800/95 backdrop-blur">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">智能体预览</h2>
                <p className="text-xs text-dark-400">测试Dify智能体响应</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={clearConversation}
                className="p-2 text-dark-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all duration-200"
                title="清空会话"
              >
                <Trash2 className="w-5 h-5" />
              </button>
              <button
                onClick={onClose}
                className="p-2 text-dark-400 hover:text-white hover:bg-dark-700 rounded-lg transition-all duration-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* 消息列表 */}
          <div
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto p-6 space-y-6 bg-gradient-to-b from-dark-900/50 to-dark-800/50 custom-scrollbar"
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: '#334155 #1e293b',
            }}
          >
            <style>{`
              .custom-scrollbar::-webkit-scrollbar {
                width: 8px;
              }
              .custom-scrollbar::-webkit-scrollbar-track {
                background: #1e293b;
                border-radius: 4px;
              }
              .custom-scrollbar::-webkit-scrollbar-thumb {
                background: #334155;
                border-radius: 4px;
              }
              .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                background: #475569;
              }
            `}</style>

            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-primary-500/20 to-primary-700/20 flex items-center justify-center border border-primary-500/30">
                    <MessageSquare className="w-10 h-10 text-primary-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">开始对话</h3>
                  <p className="text-dark-400 mb-1">输入问题，测试智能体的响应能力</p>
                  <p className="text-dark-500 text-sm">支持粘贴图片（Ctrl+V 或 Cmd+V）</p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {messages.map((msg, index) => (
                  <div
                    key={index}
                    className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {/* 头像 */}
                    {msg.role !== 'user' && (
                      <div className="flex-shrink-0">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-lg">
                          <Bot className="w-5 h-5 text-white" />
                        </div>
                      </div>
                    )}

                    {/* 消息内容 */}
                    <div className={`max-w-[75%] flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                      {/* 角色名 */}
                      <span className={`text-xs font-medium mb-2 px-2 ${msg.role === 'user' ? 'text-primary-300' : 'text-dark-400'}`}>
                        {msg.role === 'user' ? '我' : '智能体'}
                      </span>

                      {/* 气泡 */}
                      <div
                        className={`px-5 py-3 rounded-2xl ${
                          msg.role === 'user'
                            ? 'bg-gradient-to-br from-primary-600 to-primary-700 text-white rounded-tr-sm shadow-lg'
                            : msg.isError
                            ? 'bg-red-500/10 border border-red-500/30 text-red-300 rounded-tl-sm'
                            : 'bg-dark-700 text-white border border-dark-600 rounded-tl-sm shadow-md'
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
                                className="max-w-48 max-h-48 rounded-xl border border-dark-600 shadow-md"
                              />
                            ))}
                          </div>
                        )}
                        <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                      </div>

                      {/* 时间 */}
                      {msg.timestamp && (
                        <span className={`text-xs mt-2 px-1 ${msg.role === 'user' ? 'text-dark-500' : 'text-dark-500'}`}>
                          {new Date(msg.timestamp).toLocaleTimeString('zh-CN', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      )}
                    </div>

                    {/* 用户头像 */}
                    {msg.role === 'user' && (
                      <div className="flex-shrink-0">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-green-500 to-emerald-700 flex items-center justify-center shadow-lg">
                          <User className="w-5 h-5 text-white" />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* 加载状态 */}
            {loading && (
              <div className="flex gap-4 justify-start">
                <div className="flex-shrink-0">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-lg">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                </div>
                <div className="bg-dark-700 text-white px-5 py-4 rounded-2xl rounded-tl-sm border border-dark-600 shadow-md flex items-center gap-3">
                  <Loader2 className="w-5 h-5 animate-spin text-primary-400" />
                  <span className="text-dark-300">正在思考...</span>
                </div>
              </div>
            )}
          </div>

          {/* 粘贴的图片预览 */}
          {pastedImages.length > 0 && (
            <div className="px-6 py-3 border-t border-dark-700 bg-dark-800/50 flex flex-wrap gap-3">
              {pastedImages.map((img, index) => (
                <div key={index} className="relative group">
                  <img
                    src={img}
                    alt="Pasted"
                    className="w-24 h-24 object-cover rounded-xl border border-dark-600 shadow-md"
                  />
                  <button
                    onClick={() => removeImage(index)}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full text-white text-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-md hover:bg-red-600"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* 输入区域 */}
          <div className="p-4 border-t border-dark-700 bg-dark-800">
            <div className="flex gap-3 items-end">
              <div className="flex-1 relative bg-dark-700 rounded-xl border border-dark-600 focus-within:border-primary-500 transition-all duration-200">
                <textarea
                  value={inputText}
                  onChange={(e) => {
                    setInputText(e.target.value)
                    adjustTextareaHeight(e)
                  }}
                  onKeyDown={handleKeyDown}
                  onPaste={handlePaste}
                  placeholder="输入消息... (Enter发送, Shift+Enter换行)"
                  className="w-full px-4 py-3 pr-12 bg-transparent text-white placeholder-dark-500 focus:outline-none resize-none rounded-xl"
                  rows={1}
                  style={{ minHeight: '48px', maxHeight: '160px' }}
                />
                <button
                  className="absolute right-3 bottom-3 p-1.5 text-dark-400 hover:text-primary-400 transition-all duration-200 rounded-lg hover:bg-dark-600"
                  title="粘贴图片 (Ctrl+V)"
                >
                  <Image className="w-5 h-5" />
                </button>
              </div>
              <button
                onClick={sendMessage}
                disabled={loading || (!inputText.trim() && pastedImages.length === 0)}
                className="px-5 py-3 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-xl hover:from-primary-700 hover:to-primary-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg hover:shadow-primary-500/25"
              >
                <Send className="w-5 h-5" />
                发送
              </button>
            </div>
          </div>
        </div>

        {/* 右侧分析面板 */}
        <div className={`border-l border-dark-700 bg-dark-800/50 transition-all duration-300 ${panelOpen ? 'w-96' : 'w-0 overflow-hidden'}`}>
          <div className="w-96 h-full flex flex-col">
            {/* 面板头部 */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-dark-700">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-400" />
                分析面板
              </h3>
              <button
                onClick={() => setPanelOpen(false)}
                className="p-1.5 text-dark-400 hover:text-white hover:bg-dark-700 rounded-lg transition-all duration-200"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* 面板内容 */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar">
              {/* 标准答案输入 */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  标准答案
                </label>
                <textarea
                  value={standardAnswer}
                  onChange={(e) => setStandardAnswer(e.target.value)}
                  placeholder="请输入标准答案，用于对比分析..."
                  className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-xl text-white placeholder-dark-500 focus:outline-none focus:border-primary-500 resize-none"
                  rows={4}
                />
              </div>

              {/* 启用分析复选框 */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="enableAnalysis"
                  checked={enableAnalysis}
                  onChange={(e) => setEnableAnalysis(e.target.checked)}
                  className="w-4 h-4 rounded bg-dark-700 border-dark-600 text-primary-600 focus:ring-primary-500 focus:ring-offset-dark-800"
                />
                <label htmlFor="enableAnalysis" className="text-sm text-white cursor-pointer">
                  启用自动分析
                </label>
              </div>

              {/* 分析说明 */}
              <div className="p-4 bg-dark-700/50 rounded-xl border border-dark-600">
                <p className="text-xs text-dark-400">
                  启用后，每次收到AI回复会自动调用通义千问模型进行匹配度分析，从准确性、完整性、可操作性、一致性四个维度进行评分。
                </p>
              </div>

              {/* 分析结果 */}
              {(analysisResult || analyzing) && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-white font-semibold">
                    <CheckCircle2 className="w-5 h-5 text-primary-400" />
                    分析结果
                  </div>

                  {analyzing ? (
                    <div className="flex items-center gap-3 text-dark-300 p-4 bg-dark-700/50 rounded-xl">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>正在分析中...</span>
                    </div>
                  ) : analysisResult && (
                    <>
                      {/* 总分 */}
                      <div className="p-5 bg-gradient-to-br from-primary-500/20 to-primary-700/20 rounded-xl border border-primary-500/30">
                        <div className="text-center">
                          <div className={`text-4xl font-bold mb-1 ${
                            analysisResult.total_score >= 80 ? 'text-green-400' :
                            analysisResult.total_score >= 60 ? 'text-yellow-400' : 'text-red-400'
                          }`}>
                            {analysisResult.total_score.toFixed(1)}
                          </div>
                          <div className="text-sm text-dark-300">总分</div>
                        </div>
                      </div>

                      {/* 各维度分数 */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-dark-700/50 rounded-lg">
                          <span className="text-dark-200">准确性</span>
                          <div className="flex items-center gap-2">
                            <div className="w-24 h-2 bg-dark-600 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-500 transition-all duration-500"
                                style={{ width: `${analysisResult.accuracy / 40 * 100}%` }}
                              />
                            </div>
                            <span className="text-blue-400 font-medium w-12 text-right">
                              {analysisResult.accuracy.toFixed(0)}/40
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between p-3 bg-dark-700/50 rounded-lg">
                          <span className="text-dark-200">完整性</span>
                          <div className="flex items-center gap-2">
                            <div className="w-24 h-2 bg-dark-600 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-purple-500 transition-all duration-500"
                                style={{ width: `${analysisResult.completeness / 30 * 100}%` }}
                              />
                            </div>
                            <span className="text-purple-400 font-medium w-12 text-right">
                              {analysisResult.completeness.toFixed(0)}/30
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between p-3 bg-dark-700/50 rounded-lg">
                          <span className="text-dark-200">可操作性</span>
                          <div className="flex items-center gap-2">
                            <div className="w-24 h-2 bg-dark-600 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-green-500 transition-all duration-500"
                                style={{ width: `${analysisResult.actionability / 20 * 100}%` }}
                              />
                            </div>
                            <span className="text-green-400 font-medium w-12 text-right">
                              {analysisResult.actionability.toFixed(0)}/20
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between p-3 bg-dark-700/50 rounded-lg">
                          <span className="text-dark-200">一致性</span>
                          <div className="flex items-center gap-2">
                            <div className="w-24 h-2 bg-dark-600 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-yellow-500 transition-all duration-500"
                                style={{ width: `${analysisResult.consistency / 10 * 100}%` }}
                              />
                            </div>
                            <span className="text-yellow-400 font-medium w-12 text-right">
                              {analysisResult.consistency.toFixed(0)}/10
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* 问题描述 */}
                      {analysisResult.issues && (
                        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                          <div className="flex items-start gap-2">
                            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                            <p className="text-red-300 text-sm">{analysisResult.issues}</p>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 收缩面板按钮（当面板关闭时显示） */}
        {!panelOpen && (
          <button
            onClick={() => setPanelOpen(true)}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-dark-800 border border-dark-700 rounded-xl shadow-lg hover:bg-dark-700 transition-all duration-200 z-10"
          >
            <ChevronLeft className="w-5 h-5 text-dark-300" />
          </button>
        )}
      </div>
    </div>
  )
}

export default PreviewChatModal
