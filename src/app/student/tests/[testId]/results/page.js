'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import LoadingOverlay from '@/app/components/LoadingOverlay'
import '../../../style.css'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL

export default function TestResults() {
  const params = useParams()
  const router = useRouter()
  const { testId } = params
  
  const [results, setResults] = useState(null)
  const [testData, setTestData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  
  const loadResults = useCallback(async () => {
    const studentId = localStorage.getItem('student_id')
    if (!studentId) {
      router.push('/auth/student')
      return
    }

    setIsLoading(true)
    
    try {
      // Fetch test details
      const testResponse = await fetch(`${API_BASE_URL}/test/${testId}`)
      const testResult = await testResponse.json()
      
      if (!testResponse.ok || !testResult.success) {
        throw new Error('Failed to load test details')
      }
      
      // Fetch submission and results
      const resultsResponse = await fetch(
        `${API_BASE_URL}/test/${testId}/student/${studentId}/results`
      )
      const resultsData = await resultsResponse.json()
      
      if (!resultsResponse.ok || !resultsData.success) {
        throw new Error(resultsData.message || 'Failed to load results')
      }
      
      setTestData(testResult.data.test)
      setResults(resultsData.data)
      
    } catch (err) {
      console.error('Load results error:', err)
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }, [testId, router])
  
  useEffect(() => {
    loadResults()
  }, [loadResults])
  
  const getScoreColor = (score) => {
    if (score >= 90) return 'var(--student-success-color)'
    if (score >= 75) return 'var(--student-primary-blue)'
    if (score >= 60) return 'var(--student-warning-color)'
    return 'var(--student-danger-color)'
  }
  
  const getScoreEmoji = (score) => {
    if (score >= 90) return '🎉'
    if (score >= 75) return '👏'
    if (score >= 60) return '👍'
    return '📚'
  }
  
  const getStatusLabel = (score) => {
    if (score >= 90) return 'Excellent'
    if (score >= 75) return 'Very Good'
    if (score >= 60) return 'Good'
    if (score >= 40) return 'Fair'
    return 'Needs Improvement'
  }
  
  const downloadReport = () => {
    if (!results || !testData) return
    
    const reportContent = `
Test Results Report
==================
Test: ${testData.title}
Language: ${testData.language}
Score: ${results.score || 0}/${results.total_marks || 100}
Time: ${results.duration || 0} minutes / ${testData.duration} minutes
Submitted: ${new Date(results.submitted_at).toLocaleString()}
Status: ${getStatusLabel(results.score || 0)}

${results.feedback ? `Feedback:\n${results.feedback}\n` : ''}

Final Code:
${results.code || 'No code submitted'}
    `
    
    const blob = new Blob([reportContent], { type: 'text/plain' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${testId}_results_${testData.title.replace(/\s+/g, '_')}.txt`
    a.click()
    window.URL.revokeObjectURL(url)
  }
  
  if (isLoading) {
    return (
      <LoadingOverlay
        active={true}
        message="Loading your results..."
        type="spinner"
        blur={true}
      />
    )
  }
  
  if (error || !results || !testData) {
    return (
      <div className="student-app-container">
        <header className="student-header">
          <div className="student-header-content">
            <div className="student-logo-section">
              <div>
                <h1 className="student-logo-title">CodeTest Pro</h1>
                <span className="student-logo-subtitle">Test Results</span>
              </div>
            </div>
            
            <div className="student-profile-section">
              <button 
                className="student-logout-btn"
                onClick={() => router.push('/student')}
              >
                ← Back to Dashboard
              </button>
            </div>
          </div>
        </header>
        
        <main className="student-completion-container">
          <div className="student-fade-in" style={{ textAlign: 'center', padding: '3rem' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>⚠️</div>
            <h2 style={{ color: 'var(--student-warning-color)', marginBottom: '1rem' }}>
              Results Not Available
            </h2>
            <p style={{ color: 'var(--student-text-muted)', marginBottom: '2rem' }}>
              {error || 'Results are not yet available for this test. Please check back later or contact your faculty.'}
            </p>
            <button 
              className="student-completion-btn primary"
              onClick={() => router.push('/student')}
            >
              Back to Dashboard
            </button>
          </div>
        </main>
      </div>
    )
  }
  
  const score = results.score || 0
  const totalMarks = results.total_marks || 100
  const percentage = Math.round((score / totalMarks) * 100)
  
  return (
    <div className="student-app-container">
      {/* Header */}
      <header className="student-header">
        <div className="student-header-content">
          <div className="student-logo-section">
            <div>
              <h1 className="student-logo-title">CodeTest Pro</h1>
              <span className="student-logo-subtitle">Test Results</span>
            </div>
          </div>
          
          <div className="student-profile-section">
            <button 
              className="student-logout-btn"
              onClick={() => router.push('/student')}
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Dashboard
            </button>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="student-completion-container">
        <div className="student-fade-in">
          {/* Results Header */}
          <div style={{ textAlign: 'center', marginBottom: 'var(--student-space-2xl)' }}>
            <div style={{ fontSize: '4rem', marginBottom: 'var(--student-space-lg)' }}>
              {getScoreEmoji(percentage)}
            </div>
            <h1 className="student-completion-title" style={{ color: getScoreColor(percentage) }}>
              {percentage}%
            </h1>
            <p className="student-completion-subtitle">
              {testData.title} - {getStatusLabel(percentage)}
            </p>
            <div style={{ 
              display: 'inline-block',
              background: 'rgba(6, 182, 212, 0.1)',
              border: '1px solid rgba(6, 182, 212, 0.3)',
              borderRadius: '8px',
              padding: 'var(--student-space-sm) var(--student-space-md)',
              marginTop: 'var(--student-space-md)'
            }}>
              <strong>Score:</strong> {score} / {totalMarks} marks
            </div>
            <div style={{ 
              fontSize: '0.875rem',
              color: 'var(--student-text-muted)',
              marginTop: 'var(--student-space-sm)'
            }}>
              Submitted on {new Date(results.submitted_at).toLocaleString()}
            </div>
          </div>
          
          {/* Performance Stats */}
          <div className="student-completion-stats">
            <div className="student-completion-stat">
              <div className="student-completion-stat-value" style={{ color: 'var(--student-primary-blue)' }}>
                {results.duration || 0} min
              </div>
              <div className="student-completion-stat-label">Time Taken</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--student-text-muted)', marginTop: '0.25rem' }}>
                of {testData.duration} min
              </div>
            </div>
            
            <div className="student-completion-stat">
              <div className="student-completion-stat-value" style={{ color: getScoreColor(percentage) }}>
                {score}/{totalMarks}
              </div>
              <div className="student-completion-stat-label">Final Score</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--student-text-muted)', marginTop: '0.25rem' }}>
                {percentage}%
              </div>
            </div>
            
            <div className="student-completion-stat">
              <div className="student-completion-stat-value" style={{ color: results.similarity >= 70 ? 'var(--student-danger-color)' : 'var(--student-success-color)' }}>
                {results.similarity || 0}%
              </div>
              <div className="student-completion-stat-label">Similarity</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--student-text-muted)', marginTop: '0.25rem' }}>
                {results.similarity >= 70 ? 'High similarity detected' : 'Acceptable'}
              </div>
            </div>
          </div>
          
          {/* Professor Feedback */}
          {results.feedback && (
            <div className="student-instructions-section">
              <h2 className="student-instructions-title">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                Professor Feedback
              </h2>
              <div className="student-problem-statement">
                <p style={{ fontSize: '1.1rem', lineHeight: 1.8 }}>{results.feedback}</p>
              </div>
            </div>
          )}
          
          {/* Execution Output */}
          {results.output && (
            <div className="student-test-overview-card">
              <h2 style={{ 
                color: 'var(--student-primary-cyan)',
                fontSize: '1.25rem',
                fontWeight: 600,
                marginBottom: 'var(--student-space-lg)'
              }}>
                <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Execution Output
              </h2>
              <pre style={{
                background: 'rgba(0, 0, 0, 0.3)',
                padding: 'var(--student-space-md)',
                borderRadius: '8px',
                fontFamily: 'var(--student-font-mono)',
                fontSize: '0.875rem',
                lineHeight: 1.6,
                color: results.executed === 0 ? 'var(--student-success-color)' : 'var(--student-danger-color)',
                whiteSpace: 'pre-wrap',
                wordWrap: 'break-word'
              }}>
                {results.output}
              </pre>
            </div>
          )}
          
          {/* Final Code */}
          {results.code && (
            <div className="student-code-preview">
              <div className="student-code-preview-header">
                <h3 className="student-panel-title">
                  <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                  Your Final Code Submission
                </h3>
              </div>
              <div className="student-code-preview-content">
                <pre className="student-final-code">{results.code}</pre>
              </div>
            </div>
          )}
          
          {/* Action Buttons */}
          <div className="student-completion-actions">
            <button 
              className="student-completion-btn primary"
              onClick={() => router.push('/student')}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Back to Dashboard
            </button>
            <button 
              className="student-completion-btn secondary"
              onClick={downloadReport}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download Report
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
