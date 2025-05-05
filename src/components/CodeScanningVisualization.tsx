
import React, { useEffect, useState, useRef } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
// Import the correct path for SyntaxHighlighter
import SyntaxHighlighter from "react-syntax-highlighter";
import { atomOneDark } from "react-syntax-highlighter/dist/esm/styles/hljs";

interface CodeScanningVisualizationProps {
  active: boolean;
  phase: string;
}

const codeSnippets = [
  {
    language: "typescript", 
    code: `import React from 'react';
import { Button } from '@/components/ui/button';

interface Props {
  onClick: () => void;
  label: string;
}

const ActionButton: React.FC<Props> = ({ 
  onClick, 
  label 
}) => {
  return (
    <Button 
      onClick={onClick}
      className="bg-primary text-white"
    >
      {label}
    </Button>
  );
};

export default ActionButton;`
  },
  {
    language: "typescript",
    code: `export interface Repository {
  id: number;
  name: string;
  full_name: string;
  owner: {
    login: string;
    avatar_url: string;
  };
  description: string;
  stargazers_count: number;
  forks_count: number;
  language: string;
  created_at: string;
  updated_at: string;
  topics: string[];
  default_branch: string;
}`
  },
  {
    language: "tsx",
    code: `function RepositoryCard({ repo }) {
  return (
    <div className="border rounded-lg p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <img 
          src={repo.owner.avatar_url} 
          className="w-8 h-8 rounded-full" 
          alt="Owner avatar" 
        />
        <span className="font-medium">{repo.full_name}</span>
      </div>
      <p className="text-sm text-muted-foreground mt-2">
        {repo.description || "No description provided"}
      </p>
      <div className="flex items-center gap-4 mt-4 text-sm">
        <span>⭐ {repo.stargazers_count}</span>
        <span>🍴 {repo.forks_count}</span>
        <span>{repo.language}</span>
      </div>
    </div>
  );
}`
  },
  {
    language: "typescript",
    code: `export async function fetchRepositoryData(
  repoUrl: string, 
  apiKey: string | null,
  progressCallback?: (completed: number, total: number) => void
): Promise<RepoData | null> {
  try {
    const repoInfo = parseGitHubUrl(repoUrl);
    if (!repoInfo) return null;
    
    const { owner, repo } = repoInfo;
    const headers = apiKey ? { 
      Authorization: \`Bearer \${apiKey}\` 
    } : {};
    
    // Fetch repository details
    const repoResponse = await fetch(
      \`https://api.github.com/repos/\${owner}/\${repo}\`, 
      { headers }
    );
    
    if (!repoResponse.ok) {
      throw new Error(\`Failed to fetch repository: \${repoResponse.status}\`);
    }
    
    const repoData = await repoResponse.json();
    progressCallback?.(1, 10);
    
    // Continue with more API calls...
    return processRepositoryData(repoData);
  } catch (error) {
    console.error("Error fetching repository data:", error);
    return null;
  }
}`
  },
  {
    language: "jsx",
    code: `<Tabs defaultValue="code" className="w-full">
  <TabsList>
    <TabsTrigger value="code">Code</TabsTrigger>
    <TabsTrigger value="preview">Preview</TabsTrigger>
    <TabsTrigger value="console">Console</TabsTrigger>
  </TabsList>
  <TabsContent value="code" className="p-0">
    <div className="relative">
      <Button 
        size="sm" 
        variant="ghost" 
        className="absolute right-2 top-2"
      >
        <ClipboardIcon className="h-4 w-4" />
      </Button>
      <SyntaxHighlighter 
        language="typescript" 
        style={atomOneDark}
        className="rounded-md text-sm"
      >
        {code}
      </SyntaxHighlighter>
    </div>
  </TabsContent>
</Tabs>`
  }
];

const CodeScanningVisualization: React.FC<CodeScanningVisualizationProps> = ({
  active,
  phase
}) => {
  const [currentSnippetIndex, setCurrentSnippetIndex] = useState(0);
  const [visibleLines, setVisibleLines] = useState(0);
  const [scrollPosition, setScrollPosition] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const currentSnippet = codeSnippets[currentSnippetIndex];
  const totalLines = currentSnippet.code.split('\n').length;

  useEffect(() => {
    if (!active) {
      // Reset state when not active
      setVisibleLines(0);
      setScrollPosition(0);
      return;
    }

    // Change snippet every 8-12 seconds
    const snippetInterval = setInterval(() => {
      setCurrentSnippetIndex(prev => (prev + 1) % codeSnippets.length);
      setVisibleLines(0);
      setScrollPosition(0);
    }, 10000);
    
    // Reveal one line at a time
    const lineInterval = setInterval(() => {
      if (visibleLines < totalLines) {
        setVisibleLines(prev => prev + 1);
      }
    }, 100);
    
    // Scroll down gradually
    const scrollInterval = setInterval(() => {
      if (containerRef.current) {
        const maxScroll = containerRef.current.scrollHeight - containerRef.current.clientHeight;
        if (scrollPosition < maxScroll) {
          setScrollPosition(prev => Math.min(prev + 2, maxScroll));
          containerRef.current.scrollTop = scrollPosition;
        }
      }
    }, 150);
    
    return () => {
      clearInterval(snippetInterval);
      clearInterval(lineInterval);
      clearInterval(scrollInterval);
    };
  }, [active, currentSnippetIndex, visibleLines, totalLines, scrollPosition]);
  
  const getVisibleCode = () => {
    const lines = currentSnippet.code.split('\n');
    return lines.slice(0, visibleLines).join('\n');
  };
  
  if (!active) {
    return (
      <div className="rounded-md bg-background border border-border h-[200px] flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Code visualization paused</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Scanning Repository Code</h3>
        <span className="bg-blue-500/10 text-blue-500 text-xs px-2 py-0.5 rounded-full">
          {phase}
        </span>
      </div>
      
      <div 
        ref={containerRef}
        className="rounded-md border border-border overflow-hidden h-[200px] relative"
      >
        {/* Scanning line animation */}
        <div 
          className="absolute h-[2px] bg-primary w-full opacity-50 z-10 transition-all duration-100"
          style={{ 
            top: `${Math.min((visibleLines / totalLines) * 100, 99)}%`,
            boxShadow: '0 0 10px 2px rgba(var(--primary), 0.3)' 
          }}
        />
        
        <SyntaxHighlighter 
          language={currentSnippet.language}
          style={atomOneDark}
          className="h-full"
          showLineNumbers
        >
          {getVisibleCode()}
        </SyntaxHighlighter>
      </div>
    </div>
  );
};

export default CodeScanningVisualization;
