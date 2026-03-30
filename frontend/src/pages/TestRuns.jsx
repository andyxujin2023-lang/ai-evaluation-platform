import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Eye, Trash2, Play, AlertCircle, CheckCircle, Clock, Folder, MessageSquare } from 'lucide-react'
import { testRunsApi, testBatchesApi } from '../api'
import PreviewChatModal from '../components/PreviewChatModal'

function TestRuns() {
  const [testRuns, setTestRuns] = useState([])
  const [batches, setBatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [formData, setFormData] = useState({ name: '', description: '', batch_id: '' })
  const [startingTest, setStartingTest] = useState(null)

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 3000)
    return () => clearInterval(interval)
  }, [])

  const loadData = async () => {
    try {
      const [runsRes, batchesRes] = await Promise.all([
        testRunsApi.listTestRuns(),
        testBatchesApi.listBatches()
      ])
      setTestRuns(runsRes.data)
      setBatches(batchesRes.data)
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleStartTest = async (e) => {
    e.preventDefault()
    try {
      setStartingTest(true)
      const res = await testRunsApi.startTestRun(formData)
      setShowModal(false)
      setFormData({ name: '', description: '', batch_id: '' })
      loadData()
    } catch (error) {
      console.error('Failed to start test run:', error)
      alert('启动测试失败，请重试')
    } finally {
      setStartingTest(false)
    }
  }

  const getBatchName = (batchId) => {
    const batch = batches.find(b => b.id === batchId)
    return batch ? batch.name : '全部问题'
  }

  const handleDelete = async (id) => {
    if (confirm('确定要删除这个测试运行吗？')) {
      try {
        await testRunsApi.deleteTestRun(id)
        loadData()
      } catch (error) {
        console.error('Failed to delete test run:', error)
        alert('删除失败，请重试')
      }
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'running': return <Clock className="w-5 h-5 text-yellow-500 animate-pulse" />
      case 'failed': return <AlertCircle className="w-5 h-5 text-red-500" />
      default: return <Clock className="w-5 h-5 text-gray-500" />
    }
  }

  const getStatusText = (status) => {
    switch (status) {
      case 'completed': return '已完成'
      case 'running': return '运行中'
      case 'failed': return '失败'
      default: return '等待中'
    }
  }

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-500/20 text-green-400'
      case 'running': return 'bg-yellow-500/20 text-yellow-400'
      case 'failed': return 'bg-red-500/20 text-red-400'
      default: return 'bg-gray-500/20 text-gray-400'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-dark-400">加载中...</div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">测试运行</h1>
          <p className="text-dark-400">管理和查看测试运行</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowPreviewModal(true)}
            className="px-6 py-3 bg-dark-700 text-white rounded-lg hover:bg-dark-600 transition-colors flex items-center gap-2"
          >
            <MessageSquare className="w-5 h-5" />
            预览
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2"
          >
            <Play className="w-5 h-5" />
            开始新测试
          </button>
        </div>
      </div>

      <div className="bg-dark-800 rounded-xl border border-dark-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-dark-700/50">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white">测试名称</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white">测试批</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white">状态</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white">进度</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white">平均分</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white">幻觉率</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white">创建时间</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-white">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-700">
              {testRuns.map((run) => (
                <tr key={run.id} className="hover:bg-dark-700/30">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(run.status)}
                      <div>
                        <div className="text-white font-medium">{run.name}</div>
                        {run.description && (
                          <div className="text-dark-400 text-sm">{run.description}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {run.batch_id ? (
                      <span className="flex items-center gap-1 text-primary-400 text-sm">
                        <Folder className="w-4 h-4" />
                        {getBatchName(run.batch_id)}
                      </span>
                    ) : (
                      <span className="text-dark-400 text-sm">全部问题</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadgeClass(run.status)}`}>
                      {getStatusText(run.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {run.total_questions > 0 && (
                      <div className="flex items-center gap-3">
                        <div className="w-32 h-2 bg-dark-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary-500 transition-all duration-300"
                            style={{ width: `${(run.completed_questions / run.total_questions) * 100}%` }}
                          />
                        </div>
                        <span className="text-dark-300 text-sm">
                          {run.completed_questions}/{run.total_questions}
                        </span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {run.average_score != null ? (
                      <span className={`font-bold ${
                        run.average_score >= 80 ? 'text-green-500' :
                        run.average_score >= 60 ? 'text-yellow-500' : 'text-red-500'
                      }`}>
                        {run.average_score.toFixed(1)}
                      </span>
                    ) : (
                      <span className="text-dark-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {run.hallucination_rate != null ? (
                      <span className={run.hallucination_rate > 20 ? 'text-red-400' : 'text-dark-300'}>
                        {run.hallucination_rate.toFixed(1)}%
                      </span>
                    ) : (
                      <span className="text-dark-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-dark-300">
                    {new Date(run.created_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-2">
                      <Link
                        to={`/test-runs/${run.id}`}
                        className="p-2 text-dark-400 hover:text-white hover:bg-dark-700 rounded-lg transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => handleDelete(run.id)}
                        className="p-2 text-dark-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {testRuns.length === 0 && (
          <div className="px-6 py-12 text-center text-dark-400">
            还没有测试运行，点击上方按钮开始新测试
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-dark-800 rounded-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold text-white mb-6">开始新测试</h2>
            <form onSubmit={handleStartTest} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">测试名称</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                  placeholder="例如：v1.0 版本测试"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-2">测试批（可选）</label>
                <select
                  value={formData.batch_id}
                  onChange={(e) => setFormData({ ...formData, batch_id: e.target.value })}
                  className="w-full px-4 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                >
                  <option value="">全部问题</option>
                  {batches.map((batch) => (
                    <option key={batch.id} value={batch.id}>
                      {batch.name}
                    </option>
                  ))}
                </select>
                <p className="text-dark-400 text-xs mt-1">选择测试批后，仅测试该批次中的问题</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-2">描述（可选）</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                  rows={3}
                  placeholder="测试描述..."
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-dark-700 text-white rounded-lg hover:bg-dark-600 transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={startingTest}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                >
                  {startingTest ? '启动中...' : '开始测试'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 预览聊天窗口 */}
      <PreviewChatModal
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
      />
    </div>
  )
}

export default TestRuns
