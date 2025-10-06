'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import '../../../style.css'

export default function TestResults() {
  const params = useParams()
  const router = useRouter()
  const { testId } = params
  
  // Mock results data based on testId
  const getResultsData = (id) => {
    const results = {
      'test_001': {
        testTitle: 'Advanced Algorithms Final',
        professor: 'Prof. Johnson',
        language: 'Java',
        score: 92,
        totalMarks: 100,
        timeTaken: '67:32',
        totalTime: '90:00',
        submittedAt: '2024-09-25T15:22:00',
        status: 'Excellent',
        rank: 3,
        totalStudents: 45,
        feedback: 'Outstanding performance! Your dynamic programming solution was efficient and well-structured. Consider edge case handling for future improvements.',
        breakdown: {
          correctness: 85,
          efficiency: 95,
          codeQuality: 90,
          documentation: 88
        },
        detailedResults: [
          {
            testCase: 'Basic Array Test',
            input: '[-2, 1, -3, 4, 5]',
            expected: '9',
            actual: '9',
            status: 'passed',
            time: '12ms'
          },
          {
            testCase: 'Edge Case - All Negative',
            input: '[-5, -2, -8, -1]',
            expected: '-1',
            actual: '-1',
            status: 'passed',
            time: '8ms'
          },
          {
            testCase: 'Large Array Test',
            input: '[Array of 10000 elements]',
            expected: '50000',
            actual: '50000',
            status: 'passed',
            time: '45ms'
          },
          {
            testCase: 'Single Element',
            input: '[42]',
            expected: '42',
            actual: '42',
            status: 'passed',
            time: '3ms'
          }
        ],
        finalCode: `public class Solution {
    public static void main(String[] args) {
        int[] arr = {-2, 1, -3, 4, 5};
        System.out.println(maxSubarraySum(arr));
    }
    
    public static int maxSubarraySum(int[] arr) {
        if (arr.length == 0) return 0;
        
        int maxSoFar = arr[0];
        int maxEndingHere = arr[0];
        
        for (int i = 1; i < arr.length; i++) {
            maxEndingHere = Math.max(arr[i], maxEndingHere + arr[i]);
            maxSoFar = Math.max(maxSoFar, maxEndingHere);
        }
        
        return maxSoFar;
    }
}`
      },
      'test_active': {
        testTitle: 'Database Management Systems',
        professor: 'Prof. Martinez',
        language: 'SQL',
        score: 88,
        totalMarks: 100,
        timeTaken: '62:45',
        totalTime: '75:00',
        submittedAt: new Date().toISOString(),
        status: 'Very Good',
        rank: 5,
        totalStudents: 32,
        feedback: 'Solid understanding of database concepts. Your normalization and query optimization skills are impressive. Work on complex joins for improvement.',
        breakdown: {
          correctness: 90,
          efficiency: 85,
          codeQuality: 88,
          documentation: 90
        },
        detailedResults: [
          {
            testCase: 'Basic SELECT Queries',
            input: 'SELECT * FROM students WHERE major = "CS"',
            expected: '25 rows returned',
            actual: '25 rows returned',
            status: 'passed',
            time: '15ms'
          },
          {
            testCase: 'Complex JOIN Operations',
            input: 'Multi-table join with aggregation',
            expected: 'Correct enrollment statistics',
            actual: 'Correct enrollment statistics',
            status: 'passed',
            time: '45ms'
          },
          {
            testCase: 'Stored Procedure Creation',
            input: 'CREATE PROCEDURE calculateGPA',
            expected: 'Procedure created successfully',
            actual: 'Procedure created successfully',
            status: 'passed',
            time: '8ms'
          },
          {
            testCase: 'Database Normalization',
            input: 'Normalize to 3NF',
            expected: 'Properly normalized tables',
            actual: 'Minor redundancy in design',
            status: 'partial',
            time: '20ms'
          }
        ],
        finalCode: `-- Student table creation
CREATE TABLE students (
    student_id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    major VARCHAR(50),
    enrollment_date DATE
);

-- Calculate GPA stored procedure
DELIMITER //
CREATE PROCEDURE CalculateGPA(IN student_id INT)
BEGIN
    SELECT AVG(score/max_score * 4.0) as GPA
    FROM grades g
    JOIN enrollments e ON g.enrollment_id = e.enrollment_id
    WHERE e.student_id = student_id;
END //
DELIMITER ;

-- Complex query for student statistics
SELECT 
    s.name,
    s.major,
    COUNT(e.course_id) as courses_enrolled,
    AVG(g.score/g.max_score * 100) as avg_percentage
FROM students s
LEFT JOIN enrollments e ON s.student_id = e.student_id
LEFT JOIN grades g ON e.enrollment_id = g.enrollment_id
GROUP BY s.student_id, s.name, s.major
HAVING avg_percentage > 85
ORDER BY avg_percentage DESC;`
      },
      'test_004': {
        testTitle: 'Python Fundamentals Quiz',
        professor: 'Prof. Davis',
        language: 'Python',
        score: 92,
        totalMarks: 100,
        timeTaken: '45:20',
        totalTime: '60:00',
        submittedAt: '2024-09-24T11:20:00',
        status: 'Excellent',
        rank: 2,
        totalStudents: 38,
        feedback: 'Excellent grasp of Python fundamentals! Your code is clean and efficient. Great use of list comprehensions and built-in functions.',
        breakdown: {
          correctness: 95,
          efficiency: 90,
          codeQuality: 92,
          documentation: 90
        },
        detailedResults: [
          {
            testCase: 'List Operations',
            input: '[1, 2, 3, 4, 5]',
            expected: '[2, 4, 6, 8, 10]',
            actual: '[2, 4, 6, 8, 10]',
            status: 'passed',
            time: '5ms'
          },
          {
            testCase: 'Dictionary Manipulation',
            input: '{"a": 1, "b": 2, "c": 3}',
            expected: 'Filtered and sorted correctly',
            actual: 'Filtered and sorted correctly',
            status: 'passed',
            time: '3ms'
          },
          {
            testCase: 'Function Implementation',
            input: 'fibonacci(10)',
            expected: '55',
            actual: '55',
            status: 'passed',
            time: '8ms'
          },
          {
            testCase: 'Error Handling',
            input: 'Invalid input handling',
            expected: 'Proper exception handling',
            actual: 'Basic exception handling',
            status: 'partial',
            time: '12ms'
          }
        ],
        finalCode: `def fibonacci(n):
    """Calculate nth Fibonacci number using dynamic programming."""
    if n <= 1:
        return n
    
    a, b = 0, 1
    for _ in range(2, n + 1):
        a, b = b, a + b
    return b

def process_data(data_list):
    """Process list data with filtering and transformation."""
    try:
        # Filter even numbers and double them
        result = [x * 2 for x in data_list if isinstance(x, int) and x % 2 == 0]
        return sorted(result)
    except TypeError:
        return []

def analyze_dict(data_dict):
    """Analyze dictionary data and return statistics."""
    if not isinstance(data_dict, dict):
        raise ValueError("Input must be a dictionary")
    
    numeric_values = [v for v in data_dict.values() if isinstance(v, (int, float))]
    
    return {
        'count': len(numeric_values),
        'sum': sum(numeric_values),
        'average': sum(numeric_values) / len(numeric_values) if numeric_values else 0
    }

# Test the functions
if __name__ == "__main__":
    print(f"Fibonacci(10): {fibonacci(10)}")
    print(f"Processed data: {process_data([1, 2, 3, 4, 5, 6])}")
    print(f"Dict analysis: {analyze_dict({'a': 10, 'b': 20, 'c': 30})}")`
      }
    }
    return results[id] || results['test_001'] // Fallback
  }
  
  const [results] = useState(getResultsData(testId))
  const [isLoading, setIsLoading] = useState(true)
  
  useEffect(() => {
    // Simulate loading time
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 1000)
    
    return () => clearTimeout(timer)
  }, [])
  
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
  
  const downloadReport = () => {
    const reportContent = `
Test Results Report
==================
Test: ${results.testTitle}
Professor: ${results.professor}
Language: ${results.language}
Score: ${results.score}/${results.totalMarks}
Time: ${results.timeTaken} / ${results.totalTime}
Submitted: ${new Date(results.submittedAt).toLocaleString()}
Rank: ${results.rank} out of ${results.totalStudents}
Status: ${results.status}

Performance Breakdown:
- Correctness: ${results.breakdown.correctness}%
- Efficiency: ${results.breakdown.efficiency}%
- Code Quality: ${results.breakdown.codeQuality}%
- Documentation: ${results.breakdown.documentation}%

Feedback:
${results.feedback}

Test Cases Results:
${results.detailedResults.map(tc => `
${tc.testCase}: ${tc.status.toUpperCase()}
Input: ${tc.input}
Expected: ${tc.expected}
Actual: ${tc.actual}
Time: ${tc.time}
`).join('')}

Final Code:
${results.finalCode}
    `
    
    const blob = new Blob([reportContent], { type: 'text/plain' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${testId}_results_${results.testTitle.replace(/\s+/g, '_')}.txt`
    a.click()
    window.URL.revokeObjectURL(url)
  }
  
  if (isLoading) {
    return (
      <div className="student-app-container">
        <div className="student-loading-overlay active">
          <div className="student-loading-spinner"></div>
          <div className="student-loading-text">Loading your results...</div>
        </div>
      </div>
    )
  }
  
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
              {getScoreEmoji(results.score)}
            </div>
            <h1 className="student-completion-title" style={{ color: getScoreColor(results.score) }}>
              {results.score}%
            </h1>
            <p className="student-completion-subtitle">
              {results.testTitle} - {results.status}
            </p>
            <div style={{ 
              display: 'inline-block',
              background: 'rgba(6, 182, 212, 0.1)',
              border: '1px solid rgba(6, 182, 212, 0.3)',
              borderRadius: '8px',
              padding: 'var(--student-space-sm) var(--student-space-md)',
              marginTop: 'var(--student-space-md)'
            }}>
              <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Rank: {results.rank} of {results.totalStudents} students
            </div>
            <div style={{ 
              fontSize: '0.875rem',
              color: 'var(--student-text-muted)',
              marginTop: 'var(--student-space-sm)'
            }}>
              Submitted on {new Date(results.submittedAt).toLocaleString()}
            </div>
          </div>
          
          {/* Performance Stats */}
          <div className="student-completion-stats">
            <div className="student-completion-stat">
              <div className="student-completion-stat-value" style={{ color: 'var(--student-primary-blue)' }}>
                {results.timeTaken}
              </div>
              <div className="student-completion-stat-label">Time Taken</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--student-text-muted)', marginTop: '0.25rem' }}>
                of {results.totalTime}
              </div>
            </div>
            
            <div className="student-completion-stat">
              <div className="student-completion-stat-value" style={{ color: getScoreColor(results.score) }}>
                {results.score}/{results.totalMarks}
              </div>
              <div className="student-completion-stat-label">Final Score</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--student-text-muted)', marginTop: '0.25rem' }}>
                {((results.score / results.totalMarks) * 100).toFixed(1)}%
              </div>
            </div>
            
            <div className="student-completion-stat">
              <div className="student-completion-stat-value" style={{ color: 'var(--student-success-color)' }}>
                {results.detailedResults.filter(r => r.status === 'passed').length}/{results.detailedResults.length}
              </div>
              <div className="student-completion-stat-label">Test Cases Passed</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--student-text-muted)', marginTop: '0.25rem' }}>
                {Math.round((results.detailedResults.filter(r => r.status === 'passed').length / results.detailedResults.length) * 100)}% success rate
              </div>
            </div>
          </div>
          
          {/* Performance Breakdown */}
          <div className="student-test-overview-card">
            <h2 style={{ 
              color: 'var(--student-primary-cyan)',
              fontSize: '1.5rem',
              fontWeight: 600,
              marginBottom: 'var(--student-space-lg)',
              textAlign: 'center'
            }}>
              <svg className="w-6 h-6 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Performance Breakdown
            </h2>
            
            <div className="student-test-meta-grid">
              <div className="student-meta-item">
                <div className="student-meta-label">Correctness</div>
                <div className="student-meta-value" style={{ color: getScoreColor(results.breakdown.correctness) }}>
                  {results.breakdown.correctness}%
                </div>
              </div>
              
              <div className="student-meta-item">
                <div className="student-meta-label">Efficiency</div>
                <div className="student-meta-value" style={{ color: getScoreColor(results.breakdown.efficiency) }}>
                  {results.breakdown.efficiency}%
                </div>
              </div>
              
              <div className="student-meta-item">
                <div className="student-meta-label">Code Quality</div>
                <div className="student-meta-value" style={{ color: getScoreColor(results.breakdown.codeQuality) }}>
                  {results.breakdown.codeQuality}%
                </div>
              </div>
              
              <div className="student-meta-item">
                <div className="student-meta-label">Documentation</div>
                <div className="student-meta-value" style={{ color: getScoreColor(results.breakdown.documentation) }}>
                  {results.breakdown.documentation}%
                </div>
              </div>
            </div>
          </div>
          
          {/* Professor Feedback */}
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
          
          {/* Test Cases Results */}
          <div className="student-test-overview-card">
            <h2 style={{ 
              color: 'var(--student-primary-cyan)',
              fontSize: '1.25rem',
              fontWeight: 600,
              marginBottom: 'var(--student-space-lg)'
            }}>
              <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              Test Cases Results
            </h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--student-space-md)' }}>
              {results.detailedResults.map((testCase, index) => (
                <div 
                  key={index}
                  style={{
                    background: testCase.status === 'passed' 
                      ? 'rgba(34, 197, 94, 0.1)' 
                      : testCase.status === 'partial'
                      ? 'rgba(251, 191, 36, 0.1)'
                      : 'rgba(239, 68, 68, 0.1)',
                    border: `1px solid ${testCase.status === 'passed' 
                      ? 'rgba(34, 197, 94, 0.3)' 
                      : testCase.status === 'partial'
                      ? 'rgba(251, 191, 36, 0.3)'
                      : 'rgba(239, 68, 68, 0.3)'}`,
                    borderRadius: '12px',
                    padding: 'var(--student-space-lg)'
                  }}
                >
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    marginBottom: 'var(--student-space-sm)'
                  }}>
                    <h4 style={{ 
                      color: 'var(--student-text-primary)',
                      margin: 0,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--student-space-sm)'
                    }}>
                      {testCase.status === 'passed' ? (
                        <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      ) : testCase.status === 'partial' ? (
                        <svg className="w-5 h-5" style={{color: 'var(--student-warning-color)'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                      {testCase.testCase}
                    </h4>
                    <span style={{ 
                      color: 'var(--student-text-muted)',
                      fontSize: '0.875rem',
                      background: 'rgba(107, 114, 128, 0.2)',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '6px'
                    }}>
                      {testCase.time}
                    </span>
                  </div>
                  
                  <div style={{ fontSize: '0.875rem' }}>
                    <div style={{ marginBottom: 'var(--student-space-xs)' }}>
                      <strong style={{ color: 'var(--student-text-secondary)' }}>Input:</strong>
                      <span style={{ 
                        marginLeft: 'var(--student-space-sm)', 
                        fontFamily: 'var(--student-font-mono)',
                        background: 'rgba(0, 0, 0, 0.3)',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px'
                      }}>
                        {testCase.input}
                      </span>
                    </div>
                    <div style={{ marginBottom: 'var(--student-space-xs)' }}>
                      <strong style={{ color: 'var(--student-text-secondary)' }}>Expected:</strong>
                      <span style={{ 
                        marginLeft: 'var(--student-space-sm)', 
                        fontFamily: 'var(--student-font-mono)',
                        background: 'rgba(0, 0, 0, 0.3)',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px'
                      }}>
                        {testCase.expected}
                      </span>
                    </div>
                    <div>
                      <strong style={{ color: 'var(--student-text-secondary)' }}>Your Output:</strong>
                      <span style={{ 
                        marginLeft: 'var(--student-space-sm)', 
                        fontFamily: 'var(--student-font-mono)',
                        background: 'rgba(0, 0, 0, 0.3)',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        color: testCase.status === 'passed' ? 'var(--student-success-color)' : 
                              testCase.status === 'partial' ? 'var(--student-warning-color)' :
                              'var(--student-danger-color)'
                      }}>
                        {testCase.actual}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Final Code */}
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
              <pre className="student-final-code">{results.finalCode}</pre>
            </div>
          </div>
          
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
