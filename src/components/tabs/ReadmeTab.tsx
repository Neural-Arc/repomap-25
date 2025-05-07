import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface ReadmeTabProps {
  readmeContent: string | null;
  lastUpdated?: string;
}

const ReadmeTab: React.FC<ReadmeTabProps> = ({ readmeContent, lastUpdated }) => {
  return (
    <Card>
      <CardHeader className="bg-gradient-to-r from-background to-blue-500/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <FileText className="mr-2 h-5 w-5 text-blue-500" />
            <CardTitle>README</CardTitle>
          </div>
          {lastUpdated && (
            <CardDescription>
              Last updated: {new Date(lastUpdated).toLocaleDateString()}
            </CardDescription>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        {readmeContent ? (
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                code({ node, inline, className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || '');
                  return !inline && match ? (
                    <SyntaxHighlighter
                      style={vscDarkPlus}
                      language={match[1]}
                      PreTag="div"
                      {...props}
                    >
                      {String(children).replace(/\n$/, '')}
                    </SyntaxHighlighter>
                  ) : (
                    <code className={className} {...props}>
                      {children}
                    </code>
                  );
                },
                // Customize other markdown elements
                h1: ({ node, ...props }) => <h1 className="text-2xl font-bold mt-6 mb-4" {...props} />,
                h2: ({ node, ...props }) => <h2 className="text-xl font-bold mt-5 mb-3" {...props} />,
                h3: ({ node, ...props }) => <h3 className="text-lg font-bold mt-4 mb-2" {...props} />,
                p: ({ node, ...props }) => <p className="my-3" {...props} />,
                ul: ({ node, ...props }) => <ul className="list-disc pl-6 my-3" {...props} />,
                ol: ({ node, ...props }) => <ol className="list-decimal pl-6 my-3" {...props} />,
                li: ({ node, ...props }) => <li className="my-1" {...props} />,
                a: ({ node, ...props }) => (
                  <a 
                    className="text-blue-500 hover:text-blue-600 underline" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    {...props} 
                  />
                ),
                blockquote: ({ node, ...props }) => (
                  <blockquote className="border-l-4 border-gray-300 pl-4 my-4 italic" {...props} />
                ),
                table: ({ node, ...props }) => (
                  <div className="overflow-x-auto my-4">
                    <table className="min-w-full divide-y divide-gray-200" {...props} />
                  </div>
                ),
                th: ({ node, ...props }) => (
                  <th className="px-4 py-2 bg-gray-100 dark:bg-gray-800" {...props} />
                ),
                td: ({ node, ...props }) => (
                  <td className="px-4 py-2 border-t border-gray-200 dark:border-gray-700" {...props} />
                ),
                img: ({ node, ...props }) => (
                  <img 
                    className="max-w-full h-auto rounded-lg my-4" 
                    loading="lazy"
                    {...props} 
                  />
                ),
              }}
            >
              {readmeContent}
            </ReactMarkdown>
          </div>
        ) : (
          <div className="text-center py-8">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
            <p className="mt-4 text-muted-foreground">No README content available</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ReadmeTab; 