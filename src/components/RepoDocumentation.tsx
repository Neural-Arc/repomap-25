import React, { useState, useEffect, useMemo, useCallback, lazy, Suspense } from "react";
import { 
  Download, FileText, Code, TestTube, BarChart, Folder, Book, 
  Users, Activity, Terminal, Package, FileCode, Calendar,
  GitBranch, GitCommit, Clock, Star, BookOpen
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { useApi } from "@/contexts/ApiContext";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip } from 'recharts';
import { fetchRepositoryData, extractRepoStats, getRepoDownloadUrl, RepoStats } from "@/services/githubService";

interface RepoDocumentationProps {
  repoUrl: string;
}

interface FileTypeStats {
  extension: string;
  count: number;
  percentage: number;
  color: string;
}

interface InstallationFile {
  name: string;
  path: string;
  description: string;
  content?: string;
  installCommand?: string;
}

// Preload components for faster tab switching
const preloadComponents = () => {
  const components = [
    () => import('./tabs/OverviewTab'),
    () => import('./tabs/CodeTab'),
    () => import('./tabs/ContributorsTab'),
    () => import('./tabs/InstallationTab'),
    () => import('./tabs/StatisticsTab'),
    () => import('./tabs/ReadmeTab')
  ];
  components.forEach(component => component());
};

// Lazy load tab components with preload
const OverviewTab = lazy(() => import('./tabs/OverviewTab'));
const CodeTab = lazy(() => import('./tabs/CodeTab'));
const ContributorsTab = lazy(() => import('./tabs/ContributorsTab'));
const InstallationTab = lazy(() => import('./tabs/InstallationTab'));
const StatisticsTab = lazy(() => import('./tabs/StatisticsTab'));
const ReadmeTab = lazy(() => import('./tabs/ReadmeTab'));

// Loading fallback component with animation
const TabLoadingFallback = () => (
  <div className="flex items-center justify-center h-[400px] animate-fade-in">
    <div className="flex flex-col items-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      <p className="mt-2 text-sm text-muted-foreground">Loading...</p>
    </div>
  </div>
);

// Cache for tab content
const tabContentCache = new Map();

const RepoDocumentation: React.FC<RepoDocumentationProps> = ({ repoUrl }) => {
  const { gitHubApiKey } = useApi();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<RepoStats | null>(null);
  const [readmeContent, setReadmeContent] = useState<string | null>(null);
  const [mainBranch, setMainBranch] = useState("main");
  const [fileTypes, setFileTypes] = useState<FileTypeStats[]>([]);
  const [fileCount, setFileCount] = useState(0);
  const [dirCount, setDirCount] = useState(0);
  const [codeQualityScore, setCodeQualityScore] = useState(0);
  const [installationFiles, setInstallationFiles] = useState<InstallationFile[]>([]);
  const [activeTab, setActiveTab] = useState("overview");
  const [commitActivity, setCommitActivity] = useState<any[]>([]);
  const [contributors, setContributors] = useState<any[]>([]);
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#8dd1e1', '#a4de6c', '#d0ed57'];

  // Preload components on mount
  useEffect(() => {
    preloadComponents();
  }, []);

  useEffect(() => {
    const fetchRepoData = async () => {
      setLoading(true);
      setError(null);

      try {
        const repoData = await fetchRepositoryData(repoUrl, gitHubApiKey);
        
        if (repoData) {
          const stats = extractRepoStats(repoData);
          setStats(stats);
          setMainBranch(repoData.mainBranch);
          setContributors(repoData.contributors);
          
          // Calculate file type statistics with colors
          const extensions: Record<string, number> = {};
          let totalFiles = 0;
          let totalDirs = 0;
          
          // Count files by extension and directories
          Object.values(repoData.files).forEach(fileList => {
            fileList.forEach(file => {
              if (file.type === "file") {
                totalFiles++;
                const fileParts = file.path.split('.');
                const extension = fileParts.length > 1 ? `.${fileParts.pop()}` : 'No extension';
                extensions[extension] = (extensions[extension] || 0) + 1;
              } else if (file.type === "dir") {
                totalDirs++;
              }
            });
          });
          
          // Convert to array and calculate percentages with colors
          const fileTypeStats: FileTypeStats[] = Object.entries(extensions)
            .map(([extension, count], index) => ({
              extension,
              count,
              percentage: (count / totalFiles) * 100,
              color: COLORS[index % COLORS.length]
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 8); // Get top file types
          
          setFileTypes(fileTypeStats);
          setFileCount(totalFiles);
          setDirCount(totalDirs);
          
          // Calculate a mock code quality score based on repository stats
          const hasReadme = repoData.files[""]?.some(f => f.path.toLowerCase().includes('readme'));
          const hasTests = Object.values(repoData.files).some(files => 
            files.some(f => f.path.toLowerCase().includes('test') || f.path.toLowerCase().includes('spec'))
          );
          const hasConfig = Object.values(repoData.files).some(files => 
            files.some(f => f.path.toLowerCase().includes('config') || f.path.toLowerCase().includes('.json'))
          );
          
          let score = 50; // Base score
          if (hasReadme) score += 15;
          if (hasTests) score += 20;
          if (hasConfig) score += 10;
          if (stats.contributors > 1) score += 5;
          
          // Cap at 100
          setCodeQualityScore(Math.min(100, score));
          
          // Find installation files
          const installFiles: InstallationFile[] = [];
          
          const checkForFile = (name: string, description: string, installCmd?: string) => {
            const foundFile = Object.values(repoData.files).flat().find(f => 
              f.path.toLowerCase().endsWith(name.toLowerCase())
            );
            if (foundFile) {
              installFiles.push({
                name,
                path: foundFile.path,
                description,
                installCommand: installCmd
              });
            }
          };
          
          checkForFile('package.json', 'Node.js dependencies file', 'npm install');
          checkForFile('requirements.txt', 'Python dependencies file', 'pip install -r requirements.txt');
          checkForFile('Gemfile', 'Ruby dependencies file', 'bundle install');
          checkForFile('pom.xml', 'Java Maven dependencies file', 'mvn install');
          checkForFile('composer.json', 'PHP dependencies file', 'composer install');
          checkForFile('go.mod', 'Go module definition', 'go mod download');
          checkForFile('Cargo.toml', 'Rust dependencies file', 'cargo build');
          
          setInstallationFiles(installFiles);
          
          // Generate mock commit activity data for visualization
          const mockCommitActivity = [];
          const today = new Date();
          for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);
            const label = date.toLocaleDateString('en-US', { weekday: 'short' });
            mockCommitActivity.push({
              day: label,
              commits: Math.floor(Math.random() * 10) + (i === 0 ? 2 : 1)
            });
          }
          setCommitActivity(mockCommitActivity);
          
          // Try to find README content
          const rootFiles = repoData.files[""] || [];
          const readmeFile = rootFiles.find(file => 
            file.path.toLowerCase().includes('readme') && file.type === "file"
          );
          
          if (readmeFile) {
            try {
              const readmeResponse = await fetch(readmeFile.url);
              if (readmeResponse.ok) {
                const data = await readmeResponse.json();
                // GitHub returns content as base64
                if (data.content && data.encoding === "base64") {
                  const decodedContent = atob(data.content);
                  setReadmeContent(decodedContent);
                }
              }
            } catch (err) {
              console.error("Error fetching README:", err);
            }
          }
        } else {
          setError("Failed to fetch repository data");
        }
      } catch (err) {
        console.error("Error in RepoDocumentation:", err);
        setError("An error occurred while loading repository information");
      } finally {
        setLoading(false);
      }
    };

    fetchRepoData();
  }, [repoUrl, gitHubApiKey]);

  const handleDownload = () => {
    const downloadUrl = getRepoDownloadUrl(repoUrl, mainBranch);
    
    if (downloadUrl) {
      window.open(downloadUrl, '_blank');
      toast.success("Download started!");
    } else {
      toast.error("Could not generate download link");
    }
  };

  // Calculate repository health score (simplified estimation)
  const healthScore = stats ? Math.min(
    Math.round(
      ((stats.stars > 0 ? 1 : 0) * 25) +  // Has stars
      ((stats.contributors > 0 ? 1 : 0) * 25) + // Has contributors
      ((stats.updated && new Date(stats.updated).getTime() > (Date.now() - 180 * 24 * 60 * 60 * 1000)) ? 25 : 0) + // Updated in last 6 months
      ((readmeContent ? 1 : 0) * 25) // Has README
    ), 100) : 0;

  // Memoize common props
  const commonProps = useMemo(() => ({
    stats,
    fileTypes,
    readmeContent,
    codeQualityScore
  }), [stats, fileTypes, readmeContent, codeQualityScore]);

  // Memoize tab content with caching
  const tabContent = useMemo(() => {
    const cacheKey = `${activeTab}-${JSON.stringify(commonProps)}`;
    
    if (tabContentCache.has(cacheKey)) {
      return tabContentCache.get(cacheKey);
    }

    const content = (() => {
      switch (activeTab) {
        case "overview":
          return (
            <Suspense fallback={<TabLoadingFallback />}>
              <OverviewTab 
                {...commonProps}
                fileCount={fileCount}
                dirCount={dirCount}
                installationFiles={installationFiles}
                commitActivity={commitActivity}
                healthScore={healthScore}
                handleDownload={handleDownload}
              />
            </Suspense>
          );
        case "code":
          return (
            <Suspense fallback={<TabLoadingFallback />}>
              <CodeTab {...commonProps} />
            </Suspense>
          );
        case "contributors":
          return (
            <Suspense fallback={<TabLoadingFallback />}>
              <ContributorsTab 
                contributors={contributors} 
                stats={{
                  totalContributors: stats?.contributors || 0,
                  totalCommits: stats?.commits || 0,
                  lastCommitDate: stats?.updated || ""
                }} 
              />
            </Suspense>
          );
        case "installation":
          return (
            <Suspense fallback={<TabLoadingFallback />}>
              <InstallationTab 
                repoUrl={repoUrl}
                defaultBranch={mainBranch}
                dependencies={installationFiles.map(file => ({
                  name: file.name,
                  version: "latest"
                }))}
                installationSteps={[
                  `Clone the repository: git clone ${repoUrl}`,
                  `Navigate to the project directory: cd ${repoUrl.split('/').pop()?.replace('.git', '')}`,
                  ...installationFiles.map(file => file.installCommand ? `Install dependencies: ${file.installCommand}` : null).filter(Boolean) as string[],
                  "Start the application (check README.md for specific instructions)"
                ]}
              />
            </Suspense>
          );
        case "statistics":
          return (
            <Suspense fallback={<TabLoadingFallback />}>
              <StatisticsTab 
                stats={{
                  stars: stats?.stars || 0,
                  forks: stats?.forks || 0,
                  issues: stats?.issues || 0,
                  pullRequests: 0,
                  commits: stats?.commits || 0,
                  contributors: stats?.contributors || 0,
                  language: stats?.language || "",
                  lastUpdated: stats?.updated || "",
                  createdAt: stats?.created || ""
                }}
                commitActivity={commitActivity}
                languageStats={fileTypes.map(ft => ({
                  name: ft.extension,
                  percentage: ft.percentage,
                  color: ft.color
                }))}
              />
            </Suspense>
          );
        case "readme":
          return (
            <Suspense fallback={<TabLoadingFallback />}>
              <ReadmeTab readmeContent={readmeContent} lastUpdated={stats?.updated} />
            </Suspense>
          );
        default:
          return null;
      }
    })();

    // Cache the content
    tabContentCache.set(cacheKey, content);
    
    // Limit cache size
    if (tabContentCache.size > 10) {
      const firstKey = tabContentCache.keys().next().value;
      tabContentCache.delete(firstKey);
    }

    return content;
  }, [activeTab, commonProps, contributors, mainBranch, repoUrl, commitActivity, fileCount, dirCount, installationFiles, healthScore, handleDownload]);

  // Optimized tab change handler with transition
  const handleTabChange = useCallback((value: string) => {
    if (isTransitioning) return;
    
    setIsTransitioning(true);
    requestAnimationFrame(() => {
      setActiveTab(value);
      // Reset transition state after animation
      setTimeout(() => {
        setIsTransitioning(false);
      }, 150); // Match this with your CSS transition duration
    });
  }, [isTransitioning]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="mt-4 text-muted-foreground">Loading repository documentation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center text-center">
          <p className="text-destructive text-lg mb-4">{error}</p>
          <p className="text-muted-foreground">
            Please make sure the repository exists and is public, or try adding a GitHub API key in settings.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid grid-cols-4 md:grid-cols-6 lg:w-[500px] mb-6 bg-muted/20 backdrop-blur-sm border border-border/20 p-1 gap-1">
          <TabsTrigger 
            value="overview" 
            className={`data-[state=active]:bg-background/60 data-[state=active]:backdrop-blur-md transition-all duration-150 ${isTransitioning ? 'pointer-events-none' : ''}`}
          >
            Overview
          </TabsTrigger>
          <TabsTrigger 
            value="code" 
            className={`data-[state=active]:bg-background/60 data-[state=active]:backdrop-blur-md transition-all duration-150 ${isTransitioning ? 'pointer-events-none' : ''}`}
          >
            Code
          </TabsTrigger>
          <TabsTrigger 
            value="contributors" 
            className={`data-[state=active]:bg-background/60 data-[state=active]:backdrop-blur-md transition-all duration-150 ${isTransitioning ? 'pointer-events-none' : ''}`}
          >
            Contributors
          </TabsTrigger>
          <TabsTrigger 
            value="installation" 
            className={`data-[state=active]:bg-background/60 data-[state=active]:backdrop-blur-md transition-all duration-150 ${isTransitioning ? 'pointer-events-none' : ''}`}
          >
            Installation
          </TabsTrigger>
          <TabsTrigger 
            value="statistics" 
            className={`hidden md:inline-flex data-[state=active]:bg-background/60 data-[state=active]:backdrop-blur-md transition-all duration-150 ${isTransitioning ? 'pointer-events-none' : ''}`}
          >
            Statistics
          </TabsTrigger>
          <TabsTrigger 
            value="readme" 
            className={`hidden md:inline-flex data-[state=active]:bg-background/60 data-[state=active]:backdrop-blur-md transition-all duration-150 ${isTransitioning ? 'pointer-events-none' : ''}`}
          >
            README
          </TabsTrigger>
        </TabsList>
        
        <div className={`transition-opacity duration-150 ${isTransitioning ? 'opacity-50' : 'opacity-100'}`}>
          {tabContent}
                </div>
      </Tabs>
    </div>
  );
};

export default React.memo(RepoDocumentation);
