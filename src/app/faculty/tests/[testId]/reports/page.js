"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useNotification } from '@/app/components/Notification';
import LoadingOverlay from '@/app/components/LoadingOverlay';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

// Format datetime
const formatDateTime = (datetimeStr) => {
  if (!datetimeStr) return "N/A";
  try {
    const dateTime = new Date(datetimeStr);
    if (isNaN(dateTime.getTime())) return "N/A";
    const day = dateTime.getDate().toString().padStart(2, "0");
    const month = (dateTime.getMonth() + 1).toString().padStart(2, "0");
    const year = dateTime.getFullYear();
    let hours = dateTime.getHours();
    const minutes = dateTime.getMinutes().toString().padStart(2, "0");
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const formattedHours = hours.toString().padStart(2, "0");
    return `${day}/${month}/${year} ${formattedHours}:${minutes} ${ampm}`;
  } catch (error) {
    return "N/A";
  }
};

// Format batch info
const formatBatchInfo = (branch, section, startYear) => {
  const start = parseInt(startYear);
  const end = start + 4;
  return `${branch} - ${section} Batch ${start}-${end}`;
};

const TestReports = () => {
  const router = useRouter();
  const params = useParams();
  const testId = params.testId;
  const { success, error, warning } = useNotification();
  
  const [test, setTest] = useState(null);
  const [statistics, setStatistics] = useState({
    totalEligible: 0,
    attended: 0,
    submitted: 0,
    notAttended: 0,
    attendanceRate: 0,
    submissionRate: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState("Loading reports...");
  const [exportingFormat, setExportingFormat] = useState(null);

  const fetchTestDetails = useCallback(async () => {
    const facultyId = typeof window !== 'undefined' ? localStorage.getItem("faculty_id") : null;
    if (!facultyId) {
      error("Please login to view reports", "Authentication Required");
      router.push("/auth/faculty");
      return;
    }

    setIsLoading(true);
    setLoadingMessage("Loading reports...");

    try {
      const response = await fetch(`${API_BASE_URL}/test/${testId}`);
      const data = await response.json();

      if (response.ok && data.success) {
        setTest(data.data);
        
        // Fetch statistics
        const statsResponse = await fetch(`${API_BASE_URL}/test/${testId}/statistics`);
        const statsData = await statsResponse.json();
        
        if (statsResponse.ok && statsData.success) {
          setStatistics(statsData.data);
        }
      } else {
        error(data.message || "Failed to fetch test details", "Error");
        router.push("/faculty/tests");
      }
    } catch (err) {
      error("Unable to connect to server", "Network Error");
      router.push("/faculty/tests");
    } finally {
      setIsLoading(false);
    }
  }, [testId, router, error]);

  useEffect(() => {
    if (testId) {
      fetchTestDetails();
    }
  }, [testId, fetchTestDetails]);

  const handleExport = async (format) => {
    setExportingFormat(format);
    
    try {
      const response = await fetch(`${API_BASE_URL}/test/${testId}/export/${format}`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${test.test.title}_${format}.${format === 'pdf' ? 'pdf' : format === 'excel' ? 'xlsx' : 'csv'}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        success(`Report exported as ${format.toUpperCase()}`, "Export Successful");
      } else {
        error("Failed to export report", "Export Error");
      }
    } catch (err) {
      error("Unable to export report", "Network Error");
    } finally {
      setExportingFormat(null);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoading || !test) {
    return (
      <LoadingOverlay active={isLoading} message={loadingMessage} type="spinner" blur={true} />
    );
  }

  return (
    <>
      <LoadingOverlay active={!!exportingFormat} message={`Exporting as ${exportingFormat}...`} type="spinner" blur={true} />
      
      <div className="reports-fade-in" style={{ pointerEvents: "auto" }}>
        <div className="reports-dashboard-card" style={{ pointerEvents: "auto" }}>
          {/* Back Button */}
          <div style={{ marginBottom: '1.5rem' }}>
            <Link 
              href={`/faculty/tests/${testId}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                color: '#06b6d4',
                textDecoration: 'none',
                fontSize: '0.875rem',
                fontWeight: 500
              }}
            >
              <svg style={{ width: '16px', height: '16px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Test Details
            </Link>
          </div>

          {/* Header */}
          <div style={{ marginBottom: '2rem' }}>
            <h1 style={{ color: '#06b6d4', fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              Reports & Export
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <span style={{ color: '#e2e8f0', fontSize: '1.1rem', fontWeight: 600 }}>
                {test.test.title}
              </span>
              <span style={{ color: '#94a3b8' }}>
                {formatBatchInfo(test.test.branch, test.test.section, test.test.start_year)}
              </span>
            </div>
          </div>

          {/* Statistics Cards */}
          <div className="reports-stats-grid">
            <div className="reports-stat-card">
              <div className="reports-stat-icon" style={{ background: 'linear-gradient(135deg, #06b6d4, #0891b2)' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="reports-stat-content">
                <div className="reports-stat-value">{statistics.totalEligible}</div>
                <div className="reports-stat-label">Total Eligible</div>
                <div className="reports-stat-desc">Students in {test.test.branch} {test.test.section}</div>
              </div>
            </div>

            <div className="reports-stat-card">
              <div className="reports-stat-icon" style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="reports-stat-content">
                <div className="reports-stat-value">{statistics.attended}</div>
                <div className="reports-stat-label">Attended</div>
                <div className="reports-stat-desc">{statistics.attendanceRate}% attendance rate</div>
              </div>
            </div>

            <div className="reports-stat-card">
              <div className="reports-stat-icon" style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
              </div>
              <div className="reports-stat-content">
                <div className="reports-stat-value">{statistics.submitted}</div>
                <div className="reports-stat-label">Submitted</div>
                <div className="reports-stat-desc">{statistics.submissionRate}% submission rate</div>
              </div>
            </div>

            <div className="reports-stat-card">
              <div className="reports-stat-icon" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
              </div>
              <div className="reports-stat-content">
                <div className="reports-stat-value">{statistics.notAttended}</div>
                <div className="reports-stat-label">Not Attended</div>
                <div className="reports-stat-desc">Students who didn&apos;t start</div>
              </div>
            </div>
          </div>

          {/* Export Options */}
          <div className="reports-section">
            <h2 className="reports-section-title">
              <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Export Reports
            </h2>

            <div className="reports-export-grid">
              {/* PDF Export */}
              <div className="reports-export-card">
                <div className="reports-export-icon" style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="reports-export-title">PDF Report</h3>
                <p className="reports-export-desc">
                  Complete test report with student performance, scores, and analytics
                </p>
                <button 
                  className="reports-export-btn"
                  onClick={() => handleExport('pdf')}
                  disabled={!!exportingFormat}
                  style={{ pointerEvents: 'auto', cursor: exportingFormat ? 'not-allowed' : 'pointer' }}
                >
                  <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download PDF
                </button>
              </div>

              {/* Excel Export */}
              <div className="reports-export-card">
                <div className="reports-export-icon" style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="reports-export-title">Excel Spreadsheet</h3>
                <p className="reports-export-desc">
                  Detailed data in Excel format for further analysis and processing
                </p>
                <button 
                  className="reports-export-btn"
                  onClick={() => handleExport('excel')}
                  disabled={!!exportingFormat}
                  style={{ pointerEvents: 'auto', cursor: exportingFormat ? 'not-allowed' : 'pointer' }}
                >
                  <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download Excel
                </button>
              </div>

              {/* CSV Export */}
              <div className="reports-export-card">
                <div className="reports-export-icon" style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="reports-export-title">CSV Data</h3>
                <p className="reports-export-desc">
                  Raw comma-separated values for database imports and custom tools
                </p>
                <button 
                  className="reports-export-btn"
                  onClick={() => handleExport('csv')}
                  disabled={!!exportingFormat}
                  style={{ pointerEvents: 'auto', cursor: exportingFormat ? 'not-allowed' : 'pointer' }}
                >
                  <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download CSV
                </button>
              </div>

              {/* Print */}
              <div className="reports-export-card">
                <div className="reports-export-icon" style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                </div>
                <h3 className="reports-export-title">Print Report</h3>
                <p className="reports-export-desc">
                  Print-friendly version with all test details and student results
                </p>
                <button 
                  className="reports-export-btn"
                  onClick={handlePrint}
                  style={{ pointerEvents: 'auto', cursor: 'pointer' }}
                >
                  <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Print Report
                </button>
              </div>
            </div>
          </div>

          {/* Report Contents */}
          <div className="reports-section">
            <h2 className="reports-section-title">
              <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Report Contents
            </h2>

            <div className="reports-content-list">
              <div className="reports-content-item">
                <div className="reports-content-icon">✓</div>
                <div>
                  <h4 className="reports-content-title">Test Overview</h4>
                  <p className="reports-content-desc">Basic test information, timing, and configuration</p>
                </div>
              </div>

              <div className="reports-content-item">
                <div className="reports-content-icon">✓</div>
                <div>
                  <h4 className="reports-content-title">Attendance Statistics</h4>
                  <p className="reports-content-desc">Total eligible, attended, and submission rates</p>
                </div>
              </div>

              <div className="reports-content-item">
                <div className="reports-content-icon">✓</div>
                <div>
                  <h4 className="reports-content-title">Student List & Status</h4>
                  <p className="reports-content-desc">Complete roster with completion status and timestamps</p>
                </div>
              </div>

              <div className="reports-content-item">
                <div className="reports-content-icon">✓</div>
                <div>
                  <h4 className="reports-content-title">Performance Metrics</h4>
                  <p className="reports-content-desc">Scores, averages, pass rates, and time statistics</p>
                </div>
              </div>

              <div className="reports-content-item">
                <div className="reports-content-icon">✓</div>
                <div>
                  <h4 className="reports-content-title">Code Submissions</h4>
                  <p className="reports-content-desc">Student code snapshots and execution results</p>
                </div>
              </div>

              <div className="reports-content-item">
                <div className="reports-content-icon">✓</div>
                <div>
                  <h4 className="reports-content-title">Error Analysis</h4>
                  <p className="reports-content-desc">Compilation errors, runtime issues, and debugging info</p>
                </div>
              </div>

              <div className="reports-content-item">
                <div className="reports-content-icon">✓</div>
                <div>
                  <h4 className="reports-content-title">Plagiarism Report</h4>
                  <p className="reports-content-desc">Similarity scores and flagged submissions</p>
                </div>
              </div>
            </div>
          </div>

          {/* Test Information */}
          <div className="reports-section">
            <h2 className="reports-section-title">
              <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Test Information
            </h2>

            <div className="reports-info-grid">
              <div className="reports-info-item">
                <span className="reports-info-label">Test ID:</span>
                <span className="reports-info-value">{test.test.test_id}</span>
              </div>

              <div className="reports-info-item">
                <span className="reports-info-label">Title:</span>
                <span className="reports-info-value">{test.test.title}</span>
              </div>

              <div className="reports-info-item">
                <span className="reports-info-label">Language:</span>
                <span className="reports-info-value">{test.test.language}</span>
              </div>

              <div className="reports-info-item">
                <span className="reports-info-label">Duration:</span>
                <span className="reports-info-value">{test.test.duration} minutes</span>
              </div>

              <div className="reports-info-item">
                <span className="reports-info-label">Start Time:</span>
                <span className="reports-info-value">{formatDateTime(test.test.start_time)}</span>
              </div>

              <div className="reports-info-item">
                <span className="reports-info-label">Batch:</span>
                <span className="reports-info-value">
                  {formatBatchInfo(test.test.branch, test.test.section, test.test.start_year)}
                </span>
              </div>

              <div className="reports-info-item">
                <span className="reports-info-label">Status:</span>
                <span className={`status-badge ${test.test.status === 'published' ? 'live' : 'upcoming'}`}>
                  {test.test.status}
                </span>
              </div>

              <div className="reports-info-item">
                <span className="reports-info-label">Created:</span>
                <span className="reports-info-value">{formatDateTime(test.test.created_at)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .reports-fade-in {
          animation: fadeIn 0.6s ease-out both;
        }

        .reports-dashboard-card {
          background: linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 41, 59, 0.8) 100%);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(71, 85, 105, 0.3);
          border-radius: 16px;
          padding: 2rem;
          margin-bottom: 2rem;
        }

        .reports-stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .reports-stat-card {
          background: linear-gradient(135deg, rgba(15, 23, 42, 0.8), rgba(30, 41, 59, 0.6));
          backdrop-filter: blur(15px);
          border: 1px solid rgba(71, 85, 105, 0.3);
          border-radius: 12px;
          padding: 1.5rem;
          display: flex;
          gap: 1rem;
          align-items: center;
          transition: all 0.3s ease;
        }

        .reports-stat-card:hover {
          transform: translateY(-5px);
          border-color: rgba(6, 182, 212, 0.5);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        }

        .reports-stat-icon {
          width: 60px;
          height: 60px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .reports-stat-icon svg {
          width: 32px;
          height: 32px;
          stroke: white;
        }

        .reports-stat-content {
          flex: 1;
        }

        .reports-stat-value {
          font-size: 2rem;
          font-weight: 800;
          color: #e2e8f0;
          line-height: 1;
          margin-bottom: 0.25rem;
        }

        .reports-stat-label {
          font-size: 0.875rem;
          font-weight: 600;
          color: #06b6d4;
          margin-bottom: 0.25rem;
        }

        .reports-stat-desc {
          font-size: 0.75rem;
          color: #94a3b8;
        }

        .reports-section {
          background: rgba(15, 23, 42, 0.5);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(71, 85, 105, 0.3);
          border-radius: 12px;
          padding: 1.5rem;
          margin-bottom: 2rem;
        }

        .reports-section-title {
          font-size: 1.25rem;
          font-weight: 600;
          color: #06b6d4;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1.5rem;
        }

        .reports-export-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1.5rem;
        }

        .reports-export-card {
          background: linear-gradient(135deg, rgba(15, 23, 42, 0.8), rgba(30, 41, 59, 0.6));
          backdrop-filter: blur(15px);
          border: 1px solid rgba(71, 85, 105, 0.3);
          border-radius: 12px;
          padding: 1.5rem;
          transition: all 0.3s ease;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }

        .reports-export-card:hover {
          transform: translateY(-5px);
          border-color: rgba(6, 182, 212, 0.5);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        }

        .reports-export-icon {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1rem;
        }

        .reports-export-icon svg {
          width: 40px;
          height: 40px;
          stroke: white;
        }

        .reports-export-title {
          font-size: 1.25rem;
          font-weight: 600;
          color: #e2e8f0;
          margin-bottom: 0.5rem;
        }

        .reports-export-desc {
          color: #94a3b8;
          font-size: 0.875rem;
          line-height: 1.5;
          margin-bottom: 1.5rem;
        }

        .reports-export-btn {
          width: 100%;
          padding: 0.75rem 1.5rem;
          background: linear-gradient(135deg, #06b6d4, #0891b2);
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }

        .reports-export-btn:hover:not(:disabled) {
          background: linear-gradient(135deg, #0891b2, #06b6d4);
          transform: scale(1.02);
        }

        .reports-export-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .reports-content-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .reports-content-item {
          display: flex;
          gap: 1rem;
          padding: 1rem;
          background: rgba(30, 41, 59, 0.4);
          border-radius: 8px;
          border: 1px solid rgba(71, 85, 105, 0.2);
        }

        .reports-content-icon {
          width: 32px;
          height: 32px;
          background: linear-gradient(135deg, #22c55e, #16a34a);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 700;
          flex-shrink: 0;
        }

        .reports-content-title {
          font-size: 1rem;
          font-weight: 600;
          color: #e2e8f0;
          margin-bottom: 0.25rem;
        }

        .reports-content-desc {
          font-size: 0.875rem;
          color: #94a3b8;
        }

        .reports-info-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 1rem;
        }

        .reports-info-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem 1rem;
          background: rgba(30, 41, 59, 0.4);
          border-radius: 8px;
          border: 1px solid rgba(71, 85, 105, 0.2);
        }

        .reports-info-label {
          font-size: 0.875rem;
          color: #94a3b8;
          font-weight: 500;
        }

        .reports-info-value {
          font-size: 0.875rem;
          color: #e2e8f0;
          font-weight: 600;
        }

        @keyframes fadeIn {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }

        @media (max-width: 768px) {
          .reports-dashboard-card {
            padding: 1rem;
          }

          .reports-stats-grid {
            grid-template-columns: 1fr;
          }

          .reports-export-grid {
            grid-template-columns: 1fr;
          }

          .reports-info-grid {
            grid-template-columns: 1fr;
          }
        }

        @media print {
          .reports-export-grid,
          .reports-content-list {
            display: none;
          }
        }
      `}</style>
    </>
  );
};

export default TestReports;
