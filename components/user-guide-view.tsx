
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, BookOpen, ChevronRight, FileText, Home } from 'lucide-react';

interface Section {
  id: string;
  title: string;
  level: number;
  content: string;
}

export default function UserGuideView() {
  const [markdownContent, setMarkdownContent] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSection, setActiveSection] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch the user manual markdown content
    fetch('/USER_MANUAL.md')
      .then((res) => res.text())
      .then((text) => {
        setMarkdownContent(text);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error loading user manual:', err);
        setLoading(false);
      });
  }, []);

  // Parse markdown into sections
  const sections = useMemo(() => {
    if (!markdownContent) return [];

    const lines = markdownContent.split('\n');
    const parsedSections: Section[] = [];
    let currentSection: Section | null = null;
    let contentLines: string[] = [];

    lines.forEach((line) => {
      // Check if line is a header (# Header)
      const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
      
      if (headerMatch) {
        // Save previous section
        if (currentSection) {
          parsedSections.push({
            id: currentSection.id,
            title: currentSection.title,
            level: currentSection.level,
            content: contentLines.join('\n').trim(),
          });
        }

        // Start new section
        const level = headerMatch[1].length;
        const title = headerMatch[2];
        const id = title
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-');

        currentSection = {
          id,
          title,
          level,
          content: '',
        };
        contentLines = [];
      } else if (currentSection) {
        contentLines.push(line);
      }
    });

    // Add last section
    if (currentSection !== null) {
      const section: Section = currentSection;
      parsedSections.push({
        id: section.id,
        title: section.title,
        level: section.level,
        content: contentLines.join('\n').trim(),
      });
    }

    return parsedSections;
  }, [markdownContent]);

  // Filter sections based on search query
  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return sections;

    const query = searchQuery.toLowerCase();
    return sections.filter(
      (section) =>
        section.title.toLowerCase().includes(query) ||
        section.content.toLowerCase().includes(query)
    );
  }, [sections, searchQuery]);

  // Get table of contents (only level 2 and 3 headers)
  const tableOfContents = useMemo(() => {
    return sections.filter((s) => s.level === 2 || s.level === 3);
  }, [sections]);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveSection(id);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="p-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Loading User Guide...</span>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <BookOpen className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">User Guide</h1>
        </div>
        <p className="text-gray-600">
          Complete guide to using the News Trader platform
        </p>
      </div>

      {/* Search Bar */}
      <Card className="p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            type="text"
            placeholder="Search the user guide... (e.g., 'earnings', 'backtesting', 'paper trading')"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4"
          />
        </div>
        {searchQuery && (
          <div className="mt-2 text-sm text-gray-600">
            Found {filteredSections.length} section{filteredSections.length !== 1 ? 's' : ''}{' '}
            matching "{searchQuery}"
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Table of Contents Sidebar */}
        <div className="lg:col-span-1">
          <Card className="p-4 sticky top-4">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              Contents
            </h3>
            <ScrollArea className="h-[calc(100vh-200px)]">
              <nav className="space-y-1">
                {tableOfContents.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => scrollToSection(section.id)}
                    className={`
                      w-full text-left px-3 py-2 rounded-lg text-sm transition-colors
                      ${section.level === 2 ? 'font-medium' : 'pl-6 text-gray-600'}
                      ${
                        activeSection === section.id
                          ? 'bg-blue-50 text-blue-700'
                          : 'hover:bg-gray-50'
                      }
                    `}
                  >
                    <div className="flex items-center gap-2">
                      {section.level === 2 && (
                        <ChevronRight className="h-3 w-3 flex-shrink-0" />
                      )}
                      <span className="truncate">{section.title}</span>
                    </div>
                  </button>
                ))}
              </nav>
            </ScrollArea>
          </Card>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          <Card className="p-6 sm:p-8">
            {filteredSections.length === 0 ? (
              <div className="text-center py-12">
                <Search className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No results found
                </h3>
                <p className="text-gray-600">
                  Try searching for something else or{' '}
                  <button
                    onClick={() => setSearchQuery('')}
                    className="text-blue-600 hover:underline"
                  >
                    clear your search
                  </button>
                </p>
              </div>
            ) : (
              <div className="prose prose-blue max-w-none">
                {filteredSections.map((section) => (
                  <div key={section.id} id={section.id} className="mb-8 scroll-mt-4">
                    {/* Section Header */}
                    <div
                      className={`
                        ${section.level === 1 ? 'text-3xl font-bold mb-4 pb-3 border-b-2 border-blue-600' : ''}
                        ${section.level === 2 ? 'text-2xl font-bold mb-3 mt-8' : ''}
                        ${section.level === 3 ? 'text-xl font-semibold mb-2 mt-6' : ''}
                        ${section.level === 4 ? 'text-lg font-semibold mb-2 mt-4' : ''}
                        ${section.level >= 5 ? 'text-base font-medium mb-2 mt-3' : ''}
                      `}
                    >
                      {section.title}
                    </div>

                    {/* Section Content */}
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        // Custom rendering for various elements
                        h1: ({ children }) => (
                          <h1 className="text-3xl font-bold mb-4 mt-6">{children}</h1>
                        ),
                        h2: ({ children }) => (
                          <h2 className="text-2xl font-bold mb-3 mt-6">{children}</h2>
                        ),
                        h3: ({ children }) => (
                          <h3 className="text-xl font-semibold mb-2 mt-5">{children}</h3>
                        ),
                        h4: ({ children }) => (
                          <h4 className="text-lg font-semibold mb-2 mt-4">{children}</h4>
                        ),
                        h5: ({ children }) => (
                          <h5 className="text-base font-medium mb-2 mt-3">{children}</h5>
                        ),
                        h6: ({ children }) => (
                          <h6 className="text-sm font-medium mb-2 mt-2">{children}</h6>
                        ),
                        p: ({ children }) => (
                          <p className="mb-4 text-gray-700 leading-relaxed">{children}</p>
                        ),
                        ul: ({ children }) => (
                          <ul className="list-disc list-inside mb-4 space-y-2 text-gray-700">
                            {children}
                          </ul>
                        ),
                        ol: ({ children }) => (
                          <ol className="list-decimal list-inside mb-4 space-y-2 text-gray-700">
                            {children}
                          </ol>
                        ),
                        li: ({ children }) => (
                          <li className="ml-4">{children}</li>
                        ),
                        code: ({ children, className }) => {
                          const isInline = !className;
                          if (isInline) {
                            return (
                              <code className="bg-gray-100 text-red-600 px-1.5 py-0.5 rounded text-sm font-mono">
                                {children}
                              </code>
                            );
                          }
                          return (
                            <code className="block bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto my-4 text-sm font-mono">
                              {children}
                            </code>
                          );
                        },
                        pre: ({ children }) => (
                          <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto my-4">
                            {children}
                          </pre>
                        ),
                        blockquote: ({ children }) => (
                          <blockquote className="border-l-4 border-blue-500 pl-4 italic text-gray-600 my-4">
                            {children}
                          </blockquote>
                        ),
                        table: ({ children }) => (
                          <div className="overflow-x-auto my-4">
                            <table className="min-w-full border-collapse border border-gray-300">
                              {children}
                            </table>
                          </div>
                        ),
                        thead: ({ children }) => (
                          <thead className="bg-gray-50">{children}</thead>
                        ),
                        tbody: ({ children }) => <tbody>{children}</tbody>,
                        tr: ({ children }) => (
                          <tr className="border-b border-gray-200">{children}</tr>
                        ),
                        th: ({ children }) => (
                          <th className="px-4 py-2 text-left font-semibold text-gray-700 border border-gray-300">
                            {children}
                          </th>
                        ),
                        td: ({ children }) => (
                          <td className="px-4 py-2 text-gray-700 border border-gray-300">
                            {children}
                          </td>
                        ),
                        a: ({ href, children }) => (
                          <a
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            {children}
                          </a>
                        ),
                        strong: ({ children }) => (
                          <strong className="font-semibold text-gray-900">{children}</strong>
                        ),
                        em: ({ children }) => (
                          <em className="italic text-gray-700">{children}</em>
                        ),
                        hr: () => <hr className="my-6 border-t-2 border-gray-200" />,
                      }}
                    >
                      {section.content}
                    </ReactMarkdown>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Back to Top Button */}
          {filteredSections.length > 0 && (
            <div className="mt-6 text-center">
              <Button
                variant="outline"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="gap-2"
              >
                <Home className="h-4 w-4" />
                Back to Top
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
