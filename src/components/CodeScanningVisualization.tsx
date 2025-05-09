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
  const [phaseProgress, setPhaseProgress] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const currentSnippet = codeSnippets[currentSnippetIndex];
  const totalLines = currentSnippet.code.split('\n').length;

  useEffect(() => {
    if (!active) {
      // Reset state when not active
      setVisibleLines(0);
      setScrollPosition(0);
      setPhaseProgress(0);
      return;
    }

    // Change snippet every 8-12 seconds (slowed down)
    const snippetInterval = setInterval(() => {
      if (phaseProgress >= 100) {
        setCurrentSnippetIndex(prev => (prev + 1) % codeSnippets.length);
        setVisibleLines(0);
        setScrollPosition(0);
        setPhaseProgress(0);
      }
    }, 15000); // Increased from 10000 to 15000ms
    
    // Reveal one line at a time (slowed down)
    const lineInterval = setInterval(() => {
      if (visibleLines < totalLines) {
        setVisibleLines(prev => prev + 1);
        // Update phase progress based on visible lines
        setPhaseProgress(Math.min(100, (visibleLines / totalLines) * 100));
      }
    }, 150); // Increased from 100 to 150ms
    
    // Scroll down gradually (slowed down)
    const scrollInterval = setInterval(() => {
      if (containerRef.current) {
        const maxScroll = containerRef.current.scrollHeight - containerRef.current.clientHeight;
        if (scrollPosition < maxScroll) {
          setScrollPosition(prev => Math.min(prev + 1, maxScroll)); // Reduced scroll speed
          containerRef.current.scrollTop = scrollPosition;
        }
      }
    }, 200); // Increased from 150 to 200ms
    
    return () => {
      clearInterval(snippetInterval);
      clearInterval(lineInterval);
      clearInterval(scrollInterval);
    };
  }, [active, currentSnippetIndex, visibleLines, totalLines, scrollPosition, phaseProgress]);
  
  const getVisibleCode = () => {
    const lines = currentSnippet.code.split('\n');
    return lines.slice(0, visibleLines).join('\n');
  };
  
  if (!active) {
    return (
      <div className="rounded-md bg-background border border-border h-[300px] flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Code visualization paused</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Scanning Repository Code</h3>
        <span className="bg-blue-500/10 text-blue-500 text-xs px-2 py-0.5 rounded-full">
          {phase} ({Math.round(phaseProgress)}%)
        </span>
      </div>
      
      <div 
        ref={containerRef}
        className="rounded-md border-2 border-indigo-500 overflow-hidden h-[300px] relative bg-background shadow-lg"
      >
        {/* Scanning animation effect */}
        <div 
          className="absolute h-[1px] bg-gradient-to-r from-transparent via-primary to-transparent w-full opacity-70 z-10 transition-all duration-100"
          style={{ 
            top: `${Math.min((visibleLines / totalLines) * 100, 99)}%`,
            boxShadow: '0 0 10px 2px rgba(var(--primary), 0.4)' 
          }}
        />
        
        {/* Scanning pattern overlay */}
        <div 
          className="absolute inset-0 z-0 pointer-events-none opacity-5"
          style={{
            backgroundImage: 'repeating-linear-gradient(0deg, currentColor, currentColor 1px, transparent 1px, transparent 2px)',
            backgroundSize: '100% 4px',
            animation: 'scanlines 8s linear infinite'
          }}
        />
        
        {/* Fix: Remove the jsx attribute from the style tag */}
        <style>
          {`
            @keyframes scanlines {
              0% { background-position: 0 0; }
              100% { background-position: 0 100%; }
            }
          `}
        </style>
        
        <SyntaxHighlighter 
          language={currentSnippet.language}
          style={atomOneDark}
          className="h-full"
          showLineNumbers
          wrapLines={true}
          lineProps={(lineNumber) => ({
            style: { 
              display: 'block',
              opacity: lineNumber <= visibleLines ? 1 : 0,
              transition: 'opacity 0.3s ease',
              animation: lineNumber === visibleLines ? 'typingCursor 0.8s step-end infinite' : 'none'
            }
          })}
        >
          {currentSnippet.code}
        </SyntaxHighlighter>
        
        {/* Status indicators */}
        <div className="absolute bottom-2 right-2 flex items-center gap-2 text-xs bg-black/40 backdrop-blur-sm px-2 py-1 rounded-full border border-indigo-500/20">
          <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
          <span className="text-green-300">{visibleLines}/{totalLines} lines</span>
        </div>
      </div>
    </div>
  );
};

export default CodeScanningVisualization;
