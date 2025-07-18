'use client';

import React, { useState, useEffect } from 'react';
import { Search, Filter, FileText, Play, Square, Tag, Plus, X, Edit2, Trash2 } from 'lucide-react';
import { useTestRunner } from '@/app/v2/test-runner/context';

interface Test {
  id: string;
  name: string;
  tags: string[];
  steps: string[];
  created_at: string;
  updated_at: string;
}

interface TestFilterListProps {
  className?: string;
  onTestSelect?: (test: Test) => void;
  onTestEdit?: (test: Test) => void;
  onTagEditorOpen?: () => void;
  onTestCreate?: (test: Test) => void;
}

export function TestFilterList({ className = '', onTestSelect, onTestEdit, onTagEditorOpen, onTestCreate }: TestFilterListProps) {
  const { startExecution, stopExecution, runState } = useTestRunner();
  const [tests, setTests] = useState<Test[]>([]);
  const [filteredTests, setFilteredTests] = useState<Test[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedTests, setSelectedTests] = useState<Test[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allTags, setAllTags] = useState<string[]>([]);

  // Fetch tests and extract tags
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const testsResponse = await fetch('/api/v2/tests');
        if (!testsResponse.ok) {
          throw new Error('Failed to fetch tests');
        }
        const testsData = await testsResponse.json();
        
        setTests(testsData);
        setFilteredTests(testsData);
        
        // Extract all unique tags from tests
        const uniqueTags = [...new Set(testsData.flatMap((test: Test) => test.tags || []))];
        setAllTags(uniqueTags);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Removed auto-open to prevent excessive API calls

  // Filter tests
  useEffect(() => {
    let filtered = tests;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(test =>
        test.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by selected tags
    if (selectedTags.length > 0) {
      filtered = filtered.filter(test =>
        selectedTags.some(tag => test.tags && test.tags.includes(tag))
      );
    }

    setFilteredTests(filtered);
  }, [tests, searchTerm, selectedTags]);

  const toggleTag = (tag: string) => {
    const isCurrentlySelected = selectedTags.includes(tag);
    
    if (isCurrentlySelected) {
      setSelectedTags(prev => prev.filter(t => t !== tag));
      // Remove tests with this tag from selected tests
      setSelectedTests(prev => 
        prev.filter(test => !test.tags || !test.tags.includes(tag))
      );
    } else {
      setSelectedTags(prev => [...prev, tag]);
      // Add tests with this tag to selected tests (only if they have steps)
      const testsWithTag = tests.filter(test => 
        test.tags && test.tags.includes(tag) && hasValidSteps(test)
      );
      setSelectedTests(prev => {
        const newTests = testsWithTag.filter(test => 
          !prev.some(selectedTest => selectedTest.id === test.id)
        );
        return [...prev, ...newTests];
      });
    }
  };

  const toggleTestSelection = (test: Test) => {
    // Don't allow selection of tests without steps
    if (!hasValidSteps(test)) {
      return;
    }
    
    setSelectedTests(prev =>
      prev.some(t => t.id === test.id)
        ? prev.filter(t => t.id !== test.id)
        : [...prev, test]
    );
  };

  const hasValidSteps = (test: Test) => {
    return test.steps && test.steps.length > 0 && test.steps.some(step => step.trim() !== '');
  };

  const handleRunTests = () => {
    if (selectedTests.length > 0) {
      startExecution(selectedTests[0]);
    }
  };

  const handleCreateTest = async () => {
    try {
      const response = await fetch('/api/v2/tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'New Test',
          tags: allTags.length > 0 ? [allTags[0]] : [], // Use first tag if available, empty array if none
          steps: [],
        }),
      });

      if (!response.ok) throw new Error('Failed to create test');

      const newTest = await response.json();
      
      // Refresh data
      const testsResponse = await fetch('/api/v2/tests');
      const testsData = await testsResponse.json();
      setTests(testsData);
      setFilteredTests(testsData);
      
      // Open the existing TaskEditorPanel with the new test
      if (onTestCreate) {
        onTestCreate(newTest);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create test');
    }
  };

  const handleDeleteTest = async (testId: string) => {
    if (!confirm('Are you sure you want to delete this test? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/v2/tests/${testId}`, { 
        method: 'DELETE' 
      });
      
      if (!response.ok) throw new Error('Failed to delete test');
      
      // Refresh data
      const testsResponse = await fetch('/api/v2/tests');
      const testsData = await testsResponse.json();
      setTests(testsData);
      setFilteredTests(testsData);
      
      // Remove from selected tests if it was selected
      setSelectedTests(prev => prev.filter(t => t.id !== testId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete test');
    }
  };

  if (isLoading) {
    return (
      <div className={`bg-zinc-900/80 backdrop-blur-sm border border-zinc-800/50 rounded-lg p-4 ${className}`}>
        <div className="text-gray-400 text-sm">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-zinc-900/80 backdrop-blur-sm border border-zinc-800/50 rounded-lg p-4 ${className}`}>
        <div className="text-red-400 text-sm">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className={`h-full flex flex-col ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-zinc-700/50">
        <h3 className="text-white font-medium text-sm">Test Explorer</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCreateTest}
            className="p-1 text-gray-400 hover:text-white transition-colors"
            title="Create New Test"
          >
            <FileText size={16} />
          </button>
          <button
            onClick={() => onTagEditorOpen && onTagEditorOpen()}
            className="p-1 text-gray-400 hover:text-white transition-colors"
            title="Manage Tags"
          >
            <Tag size={16} />
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="p-4 space-y-3 border-b border-zinc-700/50">
        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search tests..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-[var(--accent-color)] transition-colors"
          />
        </div>

        {/* Tags Filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <Filter size={14} className="text-gray-400" />
          {allTags.map(tag => (
            <button
              key={tag}
              onClick={() => toggleTag(tag)}
              className={`
                flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-colors
                ${selectedTags.includes(tag)
                  ? 'bg-[var(--accent-color)] text-white'
                  : 'bg-zinc-700 text-gray-300 hover:bg-zinc-600'
                }
              `}
            >
              <Tag size={12} />
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Test List */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredTests.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <FileText size={48} className="mx-auto mb-4 opacity-50" />
            <p className="text-sm">No tests found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredTests.map(test => {
              const hasSteps = hasValidSteps(test);
              const isSelected = selectedTests.some(t => t.id === test.id);
              
              return (
                <div
                  key={test.id}
                  className={`
                    p-3 rounded-lg border transition-colors group
                    ${!hasSteps 
                      ? 'bg-zinc-800/30 border-zinc-700/30 opacity-60' 
                      : isSelected
                        ? 'bg-[var(--accent-color-light)] border-[var(--accent-color-border)]'
                        : 'bg-zinc-800/50 border-zinc-700/50 hover:bg-zinc-700/50'
                    }
                    ${hasSteps ? 'cursor-pointer' : 'cursor-default'}
                  `}
                  onClick={() => hasSteps && toggleTestSelection(test)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        {/* Status Dot */}
                        <div className={`w-3 h-3 rounded-full ${
                          !hasSteps 
                            ? "bg-gray-600" 
                            : test.lastRun?.status === 'completed'
                              ? "bg-green-500"
                              : test.lastRun?.status === 'error'
                                ? "bg-red-500"
                                : test.lastRun?.status === 'running'
                                  ? "bg-yellow-500"
                                  : "bg-gray-400"
                        }`} />
                        <span className={`font-medium text-sm ${hasSteps ? "text-white" : "text-gray-400"} truncate`}>
                          {test.name}
                        </span>
                      </div>
                      
                      {/* Show tags */}
                      {test.tags && test.tags.length > 0 && (
                        <div className="flex items-center gap-1 mb-2 flex-wrap">
                          {test.tags.map(tag => (
                            <span 
                              key={tag}
                              className="bg-[var(--accent-color-light)] text-[var(--accent-color)] px-2 py-1 rounded-md text-xs font-medium"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      
                      {!hasSteps && (
                        <span className="text-yellow-400 text-xs font-medium flex items-center gap-1 mb-2">
                          <X size={12} />
                          No steps defined
                        </span>
                      )}
                      
                      {test.description && (
                        <p className="text-gray-400 text-xs mb-1">{test.description}</p>
                      )}
                      {hasSteps && (
                        <p className="text-gray-500 text-xs">
                          {test.steps.filter(step => step.trim() !== '').length} step{test.steps.filter(step => step.trim() !== '').length !== 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Edit button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onTestEdit) {
                            onTestEdit(test);
                          }
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-white transition-all"
                        title="Edit Test"
                      >
                        <Edit2 size={14} />
                      </button>
                      
                      {/* Delete button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTest(test.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-400 transition-all"
                        title="Delete Test"
                      >
                        <Trash2 size={14} />
                      </button>
                      
                      {/* Custom Checkbox */}
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          if (hasSteps) toggleTestSelection(test);
                        }}
                        className={`
                          w-4 h-4 rounded border-2 flex items-center justify-center transition-all
                          ${isSelected 
                            ? 'bg-[var(--accent-color)] border-[var(--accent-color)]' 
                            : 'border-gray-400 bg-transparent hover:border-[var(--accent-color)]'
                          }
                          ${!hasSteps ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}
                        `}
                      >
                        {isSelected && (
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Test Runner Controls */}
      <div className="p-4 border-t border-zinc-700/50">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-400">
            {selectedTests.length} test{selectedTests.length !== 1 ? 's' : ''} selected
          </div>
          <button
            onClick={handleRunTests}
            disabled={selectedTests.length === 0}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors
              ${selectedTests.length === 0
                ? 'bg-zinc-700 text-gray-400 cursor-not-allowed'
                : runState === 'running'
                  ? 'bg-[var(--accent-color)] text-white hover:bg-[var(--accent-color-hover)]'
                  : 'bg-[var(--accent-color)] text-white hover:bg-[var(--accent-color-hover)]'
              }
            `}
          >
            {runState === 'running' ? (
              <>
                <Square size={16} />
                Stop
              </>
            ) : (
              <>
                <Play size={16} />
                Run Tests
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}