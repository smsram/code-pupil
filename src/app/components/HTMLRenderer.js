"use client";

import { useState, useEffect } from 'react';

const HTMLRenderer = ({ content }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !content) {
    return null;
  }

  return (
    <>
      <div
        className="html-content-renderer"
        dangerouslySetInnerHTML={{ __html: content }}
        style={{
          color: '#e2e8f0',
          fontSize: '0.95rem',
          lineHeight: '1.7',
        }}
      />
      
      <style jsx>{`
        .html-content-renderer :global(ul),
        .html-content-renderer :global(ol) {
          padding-left: 2rem;
          margin: 0.75rem 0;
        }

        .html-content-renderer :global(li) {
          margin: 0.35rem 0;
          padding-left: 0.5rem;
          color: #e2e8f0;
        }

        .html-content-renderer :global(a) {
          color: #06b6d4;
          text-decoration: underline;
          transition: color 0.2s;
        }

        .html-content-renderer :global(a:hover) {
          color: #0ea5e9;
        }

        .html-content-renderer :global(h1) {
          font-size: 2em;
          font-weight: 700;
          margin: 1.5rem 0 0.75rem;
          color: #06b6d4;
          line-height: 1.3;
        }

        .html-content-renderer :global(h2) {
          font-size: 1.5em;
          font-weight: 700;
          margin: 1.25rem 0 0.5rem;
          color: #06b6d4;
          line-height: 1.3;
        }

        .html-content-renderer :global(h3) {
          font-size: 1.25em;
          font-weight: 700;
          margin: 1rem 0 0.5rem;
          color: #06b6d4;
          line-height: 1.3;
        }

        .html-content-renderer :global(p) {
          margin: 0.75rem 0;
          color: #e2e8f0;
        }

        .html-content-renderer :global(strong),
        .html-content-renderer :global(b) {
          font-weight: 700;
          color: #f1f5f9;
        }

        .html-content-renderer :global(em),
        .html-content-renderer :global(i) {
          font-style: italic;
          color: #cbd5e1;
        }

        .html-content-renderer :global(u) {
          text-decoration: underline;
        }

        .html-content-renderer :global(blockquote) {
          border-left: 4px solid #06b6d4;
          padding-left: 1rem;
          margin: 1rem 0;
          font-style: italic;
          color: #94a3b8;
          background: rgba(6, 182, 212, 0.05);
          padding: 1rem;
          border-radius: 0 8px 8px 0;
        }

        .html-content-renderer :global(hr) {
          border: none;
          border-top: 2px solid #475569;
          margin: 1.5rem 0;
        }

        .html-content-renderer :global(img) {
          max-width: 100%;
          height: auto;
          border-radius: 8px;
          margin: 1rem 0;
          display: block;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }

        .html-content-renderer :global(table) {
          width: 100%;
          margin: 1rem 0;
          border-collapse: collapse;
          background: rgba(30, 41, 59, 0.5);
          border-radius: 8px;
          overflow: hidden;
        }

        .html-content-renderer :global(table td),
        .html-content-renderer :global(table th) {
          border: 1px solid #475569;
          padding: 0.75rem;
          color: #e2e8f0;
          text-align: left;
        }

        .html-content-renderer :global(table th) {
          background: rgba(6, 182, 212, 0.2);
          font-weight: 600;
          color: #06b6d4;
        }

        .html-content-renderer :global(table tr:hover) {
          background: rgba(6, 182, 212, 0.05);
        }

        .html-content-renderer :global(pre) {
          background: rgba(15, 23, 42, 0.95);
          border: 1px solid rgba(71, 85, 105, 0.6);
          border-radius: 8px;
          padding: 1rem;
          margin: 1rem 0;
          overflow-x: auto;
          font-family: 'Courier New', Consolas, Monaco, monospace;
          color: #06b6d4;
          font-size: 0.9rem;
          line-height: 1.5;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }

        .html-content-renderer :global(code) {
          font-family: 'Courier New', Consolas, Monaco, monospace;
          color: #06b6d4;
        }

        .html-content-renderer :global(pre code) {
          background: none;
          padding: 0;
          border: none;
        }

        .html-content-renderer :global(:not(pre) > code) {
          background: rgba(6, 182, 212, 0.15);
          padding: 0.2rem 0.4rem;
          border-radius: 4px;
          font-size: 0.9em;
          border: 1px solid rgba(6, 182, 212, 0.3);
        }

        @media (max-width: 768px) {
          .html-content-renderer :global(table) {
            font-size: 0.85rem;
          }
          
          .html-content-renderer :global(table td),
          .html-content-renderer :global(table th) {
            padding: 0.5rem;
          }
        }
      `}</style>
    </>
  );
};

export default HTMLRenderer;
