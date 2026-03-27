import React, { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Upload, Search, X, FileSpreadsheet, Download, Folder } from 'lucide-react'
import { datasetsApi, testBatchesApi } from '../api'

function Datasets() {
  const [questions, setQuestions] = useState([])
  const [categories, setCategories] = useState([])
  const [batches, setBatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterBatch, setFilterBatch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState(null)
  const [showImportModal, setShowImportModal] = useState(false)
  const [showExcelImportModal, setShowExcelImportModal] = useState(false)
  const [importJson, setImportJson] = useState('')
  const [selectedFile, setSelectedFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [importBatchId, setImportBatchId] = useState('')
  const [selectedIds, setSelectedIds] = useState([])
  const [deleting, setDeleting] = useState(false)

  const [formData, setFormData] = useState({
    question: '',
    standard_answer: '',
    keywords: '',
    category: '',
    batch_id: ''
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [questionsRes, categoriesRes, batchesRes] = await Promise.all([
        datasetsApi.listQuestions(),
        datasetsApi.getCategories(),
        testBatchesApi.listBatches()
      ])
      setQuestions(questionsRes.data)
      setCategories(categoriesRes.data)
      setBatches(batchesRes.data)
      setSelectedIds([])
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getBatchName = (batchId) => {
    const batch = batches.find(b => b.id === batchId)
    return batch ? batch.name : ''
  }

  const filteredQuestions = questions.filter(q => {
    const matchesSearch = !searchTerm ||
      q.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.category.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = !filterCategory || q.category === filterCategory
    const matchesBatch = !filterBatch || (filterBatch === 'unassigned' ? !q.batch_id : q.batch_id === filterBatch)
    return matchesSearch && matchesCategory && matchesBatch
  })

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredQuestions.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(filteredQuestions.map(q => q.id))
    }
  }

  const toggleSelect = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id))
    } else {
      setSelectedIds([...selectedIds, id])
    }
  }

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) {
      alert('请先选择要删除的问题')
      return
    }
    if (!confirm(`确定要删除选中的 ${selectedIds.length} 个问题吗？`)) {
      return
    }
    setDeleting(true)
    try {
      await datasetsApi.batchDeleteQuestions(selectedIds)
      setSelectedIds([])
      loadData()
    } catch (error) {
      console.error('Failed to batch delete:', error)
      alert('批量删除失败，请重试')
    } finally {
      setDeleting(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const data = {
        ...formData,
        keywords: formData.keywords.split(',').map(k => k.trim()).filter(k => k),
        batch_id: formData.batch_id || null
      }
      if (editingQuestion) {
        await datasetsApi.updateQuestion(editingQuestion.id, data)
      } else {
        await datasetsApi.createQuestion(data)
      }
      setShowModal(false)
      resetForm()
      loadData()
    } catch (error) {
      console.error('Failed to save question:', error)
      alert('保存失败，请重试')
    }
  }

  const handleEdit = (question) => {
    setEditingQuestion(question)
    setFormData({
      question: question.question,
      standard_answer: question.standard_answer,
      keywords: question.keywords.join(', '),
      category: question.category,
      batch_id: question.batch_id || ''
    })
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (confirm('确定要删除这个问题吗？')) {
      try {
        await datasetsApi.deleteQuestion(id)
        loadData()
      } catch (error) {
        console.error('Failed to delete question:', error)
        alert('删除失败，请重试')
      }
    }
  }

  const handleImport = async () => {
    try {
      const data = JSON.parse(importJson)
      await datasetsApi.importQuestions(data)
      setShowImportModal(false)
      setImportJson('')
      loadData()
    } catch (error) {
      console.error('Failed to import questions:', error)
      alert('导入失败，请检查JSON格式')
    }
  }

  const handleExcelImport = async () => {
    if (!selectedFile) {
      alert('请先选择 Excel 文件')
      return
    }
    setUploading(true)
    try {
      await datasetsApi.importExcel(selectedFile, importBatchId || null)
      setShowExcelImportModal(false)
      setSelectedFile(null)
      setImportBatchId('')
      loadData()
      alert('Excel 导入成功！')
    } catch (error) {
      console.error('Failed to import Excel:', error)
      alert('Excel 导入失败，请检查文件格式')
    } finally {
      setUploading(false)
    }
  }

  const handleDownloadTemplate = () => {
    datasetsApi.downloadTemplate()
  }

  const resetForm = () => {
    setEditingQuestion(null)
    setFormData({ question: '', standard_answer: '', keywords: '', category: '', batch_id: '' })
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
        <h1 className="text-3xl font-bold text-white mb-2">测试集管理</h1>
        <p className="text-dark-400">管理测试问题和测试集</p>
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
        <select
          value={filterBatch}
          onChange={(e) => { setFilterBatch(e.target.value); setSelectedIds([]) }}
          className="px-4 py-2 bg-dark-800 border border-dark-700 rounded-lg text-white focus:outline-none focus:border-primary-500"
        >
          <option value="">全部批次</option>
          <option value="unassigned">未分配</option>
          {batches.map(batch => (
            <option key={batch.id} value={batch.id}>{batch.name}</option>
          ))}
        </select>
        <select
          value={filterCategory}
          onChange={(e) => { setFilterCategory(e.target.value); setSelectedIds([]) }}
          className="px-4 py-2 bg-dark-800 border border-dark-700 rounded-lg text-white focus:outline-none focus:border-primary-500"
        >
          <option value="">全部分类</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        {selectedIds.length > 0 && (
          <button
            onClick={handleBatchDelete}
            disabled={deleting}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <Trash2 className="w-5 h-5" />
            删除选中 ({selectedIds.length})
          </button>
        )}
        <button
          onClick={handleDownloadTemplate}
          className="px-4 py-2 bg-dark-800 text-white rounded-lg border border-dark-700 hover:bg-dark-700 transition-colors flex items-center gap-2"
        >
          <Download className="w-5 h-5" />
          下载模板
        </button>
        <button
          onClick={() => { setShowExcelImportModal(true) }}
          className="px-4 py-2 bg-dark-800 text-white rounded-lg border border-dark-700 hover:bg-dark-700 transition-colors flex items-center gap-2"
        >
          <FileSpreadsheet className="w-5 h-5" />
          导入Excel
        </button>
        <button
          onClick={() => { setShowImportModal(true) }}
          className="px-4 py-2 bg-dark-800 text-white rounded-lg border border-dark-700 hover:bg-dark-700 transition-colors flex items-center gap-2"
        >
          <Upload className="w-5 h-5" />
          导入JSON
        </button>
        <button
          onClick={() => { resetForm(); setShowModal(true) }}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          添加问题
        </button>
      </div>

      <div className="bg-dark-800 rounded-xl border border-dark-700 overflow-hidden">
        <table className="w-full">
          <thead className="bg-dark-700/50">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold text-white">
                <input
                  type="checkbox"
                  checked={filteredQuestions.length > 0 && selectedIds.length === filteredQuestions.length}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 rounded bg-dark-700 border-dark-600 text-primary-600 focus:ring-primary-500"
                />
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-white">问题</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-white">批次</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-white">分类</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-white">关键词</th>
              <th className="px-6 py-4 text-right text-sm font-semibold text-white">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dark-700">
            {filteredQuestions.map((q) => (
              <tr key={q.id} className="hover:bg-dark-700/30">
                <td className="px-6 py-4">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(q.id)}
                    onChange={() => toggleSelect(q.id)}
                    className="w-4 h-4 rounded bg-dark-700 border-dark-600 text-primary-600 focus:ring-primary-500"
                  />
                </td>
                <td className="px-6 py-4">
                  <div className="text-white max-w-md truncate">{q.question}</div>
                </td>
                <td className="px-6 py-4">
                  {q.batch_id ? (
                    <span className="flex items-center gap-1 text-primary-400 text-sm">
                      <Folder className="w-4 h-4" />
                      {getBatchName(q.batch_id)}
                    </span>
                  ) : (
                    <span className="text-dark-500 text-sm">未分配</span>
                  )}
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
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => handleEdit(q)}
                      className="p-2 text-dark-400 hover:text-white hover:bg-dark-700 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(q.id)}
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
        {filteredQuestions.length === 0 && (
          <div className="px-6 py-12 text-center text-dark-400">
            没有找到匹配的问题
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-dark-800 rounded-xl p-6 w-full max-w-2xl mx-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">
                {editingQuestion ? '编辑问题' : '添加问题'}
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
                <label className="block text-sm font-medium text-white mb-2">问题</label>
                <textarea
                  value={formData.question}
                  onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                  className="w-full px-4 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                  rows={3}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-2">标准答案</label>
                <textarea
                  value={formData.standard_answer}
                  onChange={(e) => setFormData({ ...formData, standard_answer: e.target.value })}
                  className="w-full px-4 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                  rows={4}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-2">关键词（用逗号分隔）</label>
                <input
                  type="text"
                  value={formData.keywords}
                  onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                  className="w-full px-4 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                  placeholder="关键词1, 关键词2, 关键词3"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-2">分类</label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                  placeholder="例如：监控告警、故障排查"
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
                  <option value="">未分配</option>
                  {batches.map((batch) => (
                    <option key={batch.id} value={batch.id}>
                      {batch.name}
                    </option>
                  ))}
                </select>
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

      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-dark-800 rounded-xl p-6 w-full max-w-2xl mx-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">导入JSON测试集</h2>
              <button
                onClick={() => setShowImportModal(false)}
                className="p-2 hover:bg-dark-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-dark-400" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">JSON 数据</label>
                <textarea
                  value={importJson}
                  onChange={(e) => setImportJson(e.target.value)}
                  className="w-full px-4 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white font-mono text-sm focus:outline-none focus:border-primary-500"
                  rows={10}
                  placeholder='[{"question": "...", "standard_answer": "...", "keywords": ["..."], "category": "..."}]'
                />
              </div>
              <div className="p-4 bg-dark-700/50 rounded-lg">
                <p className="text-sm text-dark-300">
                  JSON 格式示例：
                </p>
                <pre className="mt-2 text-xs text-dark-400 overflow-auto">
{`[
  {
    "question": "如何查看CPU使用率？",
    "standard_answer": "可以使用top或htop命令...",
    "keywords": ["CPU", "top", "htop"],
    "category": "监控告警"
  }
]`}
                </pre>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2 bg-dark-700 text-white rounded-lg hover:bg-dark-600 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleImport}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  导入
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
                <label className="block text-sm font-medium text-white mb-2">选择测试批（可选）</label>
                <select
                  value={importBatchId}
                  onChange={(e) => setImportBatchId(e.target.value)}
                  className="w-full px-4 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                >
                  <option value="">不分配批次</option>
                  {batches.map((batch) => (
                    <option key={batch.id} value={batch.id}>
                      {batch.name}
                    </option>
                  ))}
                </select>
              </div>
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

export default Datasets
