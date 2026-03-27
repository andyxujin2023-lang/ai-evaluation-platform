import React, { useState, useEffect } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { Plus, Edit2, Trash2, Search, X, ArrowLeft, FileSpreadsheet, Upload, Download } from 'lucide-react'
import { testBatchesApi, datasetsApi } from '../api'

function TestBatches() {
  const [batches, setBatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingBatch, setEditingBatch] = useState(null)
  const [formData, setFormData] = useState({ name: '', description: '' })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const res = await testBatchesApi.listBatches()
      setBatches(res.data)
    } catch (error) {
      console.error('Failed to load batches:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredBatches = batches.filter(b => {
    return !searchTerm ||
      b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b.description && b.description.toLowerCase().includes(searchTerm.toLowerCase()))
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingBatch) {
        await testBatchesApi.updateBatch(editingBatch.id, formData)
      } else {
        await testBatchesApi.createBatch(formData)
      }
      setShowModal(false)
      resetForm()
      loadData()
    } catch (error) {
      console.error('Failed to save batch:', error)
      alert('保存失败，请重试')
    }
  }

  const handleEdit = (batch) => {
    setEditingBatch(batch)
    setFormData({ name: batch.name, description: batch.description || '' })
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (confirm('确定要删除这个测试批吗？')) {
      try {
        await testBatchesApi.deleteBatch(id)
        loadData()
      } catch (error) {
        console.error('Failed to delete batch:', error)
        alert('删除失败，请重试')
      }
    }
  }

  const resetForm = () => {
    setEditingBatch(null)
    setFormData({ name: '', description: '' })
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
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">测试批管理</h1>
        <p className="text-dark-400">管理测试批次，按批次组织测试问题</p>
      </div>

      <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex-1 min-w-64">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
            <input
              type="text"
              placeholder="搜索测试批..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-dark-800 border border-dark-700 rounded-lg text-white placeholder-dark-400 focus:outline-none focus:border-primary-500"
            />
          </div>
        </div>
        <button
          onClick={() => { resetForm(); setShowModal(true) }}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          创建测试批
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredBatches.map((batch) => (
          <Link
            key={batch.id}
            to={`/test-batches/${batch.id}`}
            className="bg-dark-800 rounded-xl p-6 border border-dark-700 hover:border-primary-500/50 transition-colors group"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-white group-hover:text-primary-400 transition-colors truncate">
                  {batch.name}
                </h3>
                {batch.description && (
                  <p className="text-dark-400 text-sm mt-1 line-clamp-2">
                    {batch.description}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-dark-500">
                创建于 {new Date(batch.created_at).toLocaleDateString()}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    handleEdit(batch)
                  }}
                  className="p-2 text-dark-400 hover:text-white hover:bg-dark-700 rounded-lg transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    handleDelete(batch.id)
                  }}
                  className="p-2 text-dark-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {filteredBatches.length === 0 && (
        <div className="bg-dark-800 rounded-xl p-12 text-center border border-dark-700">
          <p className="text-dark-400">还没有测试批，点击上方按钮创建</p>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-dark-800 rounded-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">
                {editingBatch ? '编辑测试批' : '创建测试批'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-dark-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-dark-400" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">名称</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                  placeholder="测试批名称"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-2">描述（可选）</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                  rows={3}
                  placeholder="测试批描述..."
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
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  保存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function TestBatchDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [batch, setBatch] = useState(null)
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showExcelImportModal, setShowExcelImportModal] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    loadData()
  }, [id])

  const loadData = async () => {
    try {
      const [batchRes, questionsRes] = await Promise.all([
        testBatchesApi.getBatch(id),
        testBatchesApi.getBatchQuestions(id)
      ])
      setBatch(batchRes.data)
      setQuestions(questionsRes.data)
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadTemplate = () => {
    datasetsApi.downloadTemplate()
  }

  const handleExcelImport = async () => {
    if (!selectedFile) {
      alert('请先选择 Excel 文件')
      return
    }
    setUploading(true)
    try {
      await datasetsApi.importExcel(selectedFile, id)
      setShowExcelImportModal(false)
      setSelectedFile(null)
      loadData()
      alert('Excel 导入成功！')
    } catch (error) {
      console.error('Failed to import Excel:', error)
      alert('Excel 导入失败，请检查文件格式')
    } finally {
      setUploading(false)
    }
  }

  const filteredQuestions = questions.filter(q => {
    return !searchTerm ||
      q.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.category.toLowerCase().includes(searchTerm.toLowerCase())
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-dark-400">加载中...</div>
      </div>
    )
  }

  if (!batch) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-dark-400">测试批不存在</div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate('/test-batches')}
          className="p-2 hover:bg-dark-800 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-6 h-6 text-dark-400" />
        </button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-white mb-2">{batch.name}</h1>
          {batch.description && (
            <p className="text-dark-400">{batch.description}</p>
          )}
        </div>
        <button
          onClick={() => { setShowExcelImportModal(true) }}
          className="px-4 py-2 bg-dark-800 text-white rounded-lg border border-dark-700 hover:bg-dark-700 transition-colors flex items-center gap-2"
        >
          <FileSpreadsheet className="w-5 h-5" />
          导入Excel
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-dark-800 rounded-xl p-6 border border-dark-700">
          <div className="text-dark-400 text-sm mb-2">问题数量</div>
          <div className="text-3xl font-bold text-white">{questions.length}</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex-1 min-w-64">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
            <input
              type="text"
              placeholder="搜索问题..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-dark-800 border border-dark-700 rounded-lg text-white placeholder-dark-400 focus:outline-none focus:border-primary-500"
            />
          </div>
        </div>
      </div>

      <div className="bg-dark-800 rounded-xl border border-dark-700 overflow-hidden">
        <table className="w-full">
          <thead className="bg-dark-700/50">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold text-white">问题</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-white">分类</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-white">关键词</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dark-700">
            {filteredQuestions.map((q) => (
              <tr key={q.id} className="hover:bg-dark-700/30">
                <td className="px-6 py-4">
                  <div className="text-white max-w-md truncate">{q.question}</div>
                </td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 bg-primary-600/20 text-primary-400 rounded text-sm">{q.category}</span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-1">
                    {q.keywords.slice(0, 3).map((kw, i) => (
                      <span key={i} className="px-2 py-0.5 bg-dark-700 text-dark-300 rounded text-xs">{kw}</span>
                    ))}
                    {q.keywords.length > 3 && (
                      <span className="text-dark-400 text-xs">+{q.keywords.length - 3}</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredQuestions.length === 0 && (
          <div className="px-6 py-12 text-center text-dark-400">
            还没有问题，导入 Excel 添加问题
          </div>
        )}
      </div>

      {showExcelImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-dark-800 rounded-xl p-6 w-full max-w-xl mx-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">导入Excel测试集</h2>
              <button
                onClick={() => setShowExcelImportModal(false)}
                className="p-2 hover:bg-dark-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-dark-400" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">选择Excel文件</label>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => setSelectedFile(e.target.files[0])}
                  className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-white focus:outline-none focus:border-primary-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary-600 file:text-white file:cursor-pointer"
                />
              </div>
              {selectedFile && (
                <div className="p-3 bg-primary-600/20 border border-primary-600/30 rounded-lg">
                  <p className="text-primary-300 text-sm">
                    已选择文件: {selectedFile.name}
                  </p>
                </div>
              )}
              <div className="p-4 bg-dark-700/50 rounded-lg">
                <p className="text-sm text-dark-300">
                  Excel 文件需要包含以下列：
                </p>
                <ul className="mt-2 text-xs text-dark-400 space-y-1">
                  <li>• 问题</li>
                  <li>• 标准答案</li>
                  <li>• 关键词(多个用逗号分隔)</li>
                  <li>• 分类</li>
                </ul>
                <button
                  onClick={handleDownloadTemplate}
                  className="mt-3 text-primary-400 hover:text-primary-300 text-sm flex items-center gap-1"
                >
                  <Download className="w-4 h-4" />
                  下载示例模板
                </button>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={() => setShowExcelImportModal(false)}
                  className="px-4 py-2 bg-dark-700 text-white rounded-lg hover:bg-dark-600 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleExcelImport}
                  disabled={uploading || !selectedFile}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                >
                  {uploading ? '导入中...' : '导入'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export { TestBatches, TestBatchDetail }
export default TestBatches
