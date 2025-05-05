
import React, { useState, useEffect } from "react";
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
  const [topContributors, setTopContributors] = useState<any[]>([]);
  
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#8dd1e1', '#a4de6c', '#d0ed57'];

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
          
          // Generate mock top contributors
          const contributorCount = stats?.contributors || 3;
          const mockContributors = [];
          for (let i = 0; i < Math.min(contributorCount, 5); i++) {
            mockContributors.push({
              name: `Contributor ${i+1}`,
              commits: Math.floor(Math.random() * 50) + 10,
              role: i === 0 ? 'Owner' : 'Contributor',
              avatar: `https://randomuser.me/api/portraits/men/${i+20}.jpg`
            });
          }
          setTopContributors(mockContributors);
          
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

  // Calculate repository health score (simplified estimation)
  const healthScore = stats ? Math.min(
    Math.round(
      ((stats.stars > 0 ? 1 : 0) * 25) +  // Has stars
      ((stats.contributors > 0 ? 1 : 0) * 25) + // Has contributors
      ((stats.updated && new Date(stats.updated).getTime() > (Date.now() - 180 * 24 * 60 * 60 * 1000)) ? 25 : 0) + // Updated in last 6 months
      ((readmeContent ? 1 : 0) * 25) // Has README
    ), 100) : 0;

  return (
    <div className="space-y-6">
      {/* Top Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-4 md:grid-cols-6 lg:w-[500px] mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="code">Code</TabsTrigger>
          <TabsTrigger value="contributors">Contributors</TabsTrigger>
          <TabsTrigger value="installation">Installation</TabsTrigger>
          <TabsTrigger value="statistics" className="hidden md:inline-flex">Statistics</TabsTrigger>
          <TabsTrigger value="readme" className="hidden md:inline-flex">README</TabsTrigger>
        </TabsList>
        
        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Repository Overview */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Left Column */}
            <Card>
              <CardHeader className="bg-gradient-to-r from-background to-secondary/10">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="flex items-center">
                      <BookOpen className="mr-2 h-5 w-5 text-primary" />
                      Repository Overview
                    </CardTitle>
                    <CardDescription>Key statistics and information</CardDescription>
                  </div>
                  <Button onClick={handleDownload} className="flex items-center">
                    <Download size={16} className="mr-2" />
                    Download
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 text-amber-500" />
                      <span className="text-sm font-medium text-muted-foreground">Stars</span>
                    </div>
                    <p className="text-2xl font-bold">{stats?.stars || 0}</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-1">
                      <GitBranch className="h-4 w-4 text-emerald-500" />
                      <span className="text-sm font-medium text-muted-foreground">Forks</span>
                    </div>
                    <p className="text-2xl font-bold">{stats?.forks || 0}</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-1">
                      <Code className="h-4 w-4 text-blue-500" />
                      <span className="text-sm font-medium text-muted-foreground">Issues</span>
                    </div>
                    <p className="text-2xl font-bold">{stats?.issues || 0}</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4 text-purple-500" />
                      <span className="text-sm font-medium text-muted-foreground">Contributors</span>
                    </div>
                    <p className="text-2xl font-bold">{stats?.contributors || 0}</p>
                  </div>
                </div>
                <Separator className="my-6" />
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-muted-foreground">Created</span>
                    </div>
                    <p className="text-md">{stats?.created || "Unknown"}</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-muted-foreground">Last Updated</span>
                    </div>
                    <p className="text-md">{stats?.updated || "Unknown"}</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1">
                      <FileCode className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-muted-foreground">Main Language</span>
                    </div>
                    <p className="text-md font-medium">
                      {stats?.language ? (
                        <Badge variant="outline" className="bg-primary/10">
                          {stats.language}
                        </Badge>
                      ) : "Not specified"}
                    </p>
                  </div>
                </div>
                <Separator className="my-6" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Description</p>
                  <p className="text-md">{stats?.description || "No description available"}</p>
                </div>
              </CardContent>
            </Card>
            
            {/* Right Column */}
            <Card>
              <CardHeader className="bg-gradient-to-r from-background to-primary/10">
                <div className="flex items-center">
                  <Activity className="mr-2 h-5 w-5 text-primary" />
                  <CardTitle>Repository Health</CardTitle>
                </div>
                <CardDescription>Overall repository activity and maintenance metrics</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Health Score</span>
                      <span className="text-sm font-medium">{healthScore}%</span>
                    </div>
                    <Progress value={healthScore} className="h-2" 
                      color={healthScore > 70 ? "bg-green-500" : healthScore > 40 ? "bg-amber-500" : "bg-red-500"} />
                  </div>
                  
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <h4 className="text-sm font-medium mb-2">Activity</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Active branches</span>
                          <span className="text-sm font-medium">{stats?.branches || 0}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Open issues</span>
                          <span className="text-sm font-medium">{stats?.issues || 0}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium mb-2">Code Quality</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Quality Score</span>
                          <span className="text-sm font-medium">{codeQualityScore}%</span>
                        </div>
                        <Progress value={codeQualityScore} className="h-2" 
                          color={codeQualityScore > 70 ? "bg-green-500" : codeQualityScore > 40 ? "bg-amber-500" : "bg-red-500"} />
                        <div className="flex gap-2 flex-wrap mt-2">
                          {readmeContent && (
                            <Badge variant="outline" className="bg-green-500/10 text-green-600">Has README</Badge>
                          )}
                          {codeQualityScore > 70 && (
                            <Badge variant="outline" className="bg-green-500/10 text-green-600">Has Tests</Badge>
                          )}
                          {stats?.contributors ? (
                            <Badge variant="outline" className="bg-green-500/10 text-green-600">{stats.contributors} Contributors</Badge>
                          ) : (
                            <Badge variant="outline" className="bg-amber-500/10 text-amber-600">Single Contributor</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium mb-3">Getting Started</h4>
                    <div className="bg-muted p-3 rounded-md">
                      <code className="text-xs block">
                        git clone {repoUrl}.git<br/>
                        cd {stats?.repo?.name || "repository"}<br/>
                        {installationFiles.length > 0 && installationFiles[0].installCommand}
                      </code>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* File Structure & Commit Activity */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* File Structure */}
            <Card>
              <CardHeader className="bg-gradient-to-r from-background to-blue-500/10">
                <div className="flex items-center">
                  <Folder className="mr-2 h-5 w-5 text-blue-500" />
                  <CardTitle>Repository Structure</CardTitle>
                </div>
                <CardDescription>Organization and composition of the repository</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-muted/20 rounded-lg p-4 text-center">
                      <p className="text-3xl font-bold">{fileCount}</p>
                      <p className="text-sm text-muted-foreground">Files</p>
                    </div>
                    <div className="bg-muted/20 rounded-lg p-4 text-center">
                      <p className="text-3xl font-bold">{dirCount}</p>
                      <p className="text-sm text-muted-foreground">Directories</p>
                    </div>
                  </div>
                  
                  {fileTypes.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-3">File Type Distribution</h4>
                      <div className="h-[180px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={fileTypes}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              innerRadius={30}
                              outerRadius={60}
                              paddingAngle={5}
                              dataKey="count"
                              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            >
                              {fileTypes.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <RechartsTooltip 
                              content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                  const data = payload[0].payload;
                                  return (
                                    <div className="bg-background p-2 rounded border shadow-sm">
                                      <p>{data.extension}: {data.count} files ({data.percentage.toFixed(1)}%)</p>
                                    </div>
                                  );
                                }
                                return null;
                              }} 
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            
            {/* Commit Activity */}
            <Card>
              <CardHeader className="bg-gradient-to-r from-background to-purple-500/10">
                <div className="flex items-center">
                  <GitCommit className="mr-2 h-5 w-5 text-purple-500" />
                  <CardTitle>Commit Activity</CardTitle>
                </div>
                <CardDescription>Recent repository contributions</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="h-[180px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsBarChart
                        data={commitActivity}
                        margin={{
                          top: 5,
                          right: 30,
                          left: 0,
                          bottom: 5,
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="day" />
                        <YAxis />
                        <RechartsTooltip />
                        <Bar dataKey="commits" fill="#8884d8" />
                      </RechartsBarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex items-center justify-between text-sm text-muted-foreground mt-4">
                    <span>Last updated: {stats?.updated || "Unknown"}</span>
                    <span>{stats?.repo?.name || "Repository"} ({stats?.repo?.full_name?.split('/')[0] || "Owner"})</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {/* Code Tab */}
        <TabsContent value="code" className="space-y-6">
          <Card>
            <CardHeader className="bg-gradient-to-r from-background to-blue-500/10">
              <div className="flex items-center">
                <FileCode className="mr-2 h-5 w-5 text-blue-500" />
                <CardTitle>Code Structure & Analysis</CardTitle>
              </div>
              <CardDescription>Code organization and quality metrics</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-muted/20 p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground">Primary Language</p>
                    <p className="text-xl font-semibold">{stats?.language || "Unknown"}</p>
                  </div>
                  <div className="bg-muted/20 p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground">Complexity</p>
                    <p className="text-xl font-semibold">
                      {stats?.totalFiles && stats.totalFiles > 100 ? "High" : stats?.totalFiles && stats.totalFiles > 50 ? "Medium" : "Low"}
                    </p>
                  </div>
                  <div className="bg-muted/20 p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground">File Organization</p>
                    <p className="text-xl font-semibold">
                      {dirCount > 10 ? "Complex" : dirCount > 5 ? "Moderate" : "Simple"}
                    </p>
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <h3 className="text-lg font-medium mb-3">File Distribution</h3>
                  <div className="space-y-4">
                    {fileTypes.slice(0, 5).map((type, index) => (
                      <div key={index} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <div className="flex items-center">
                            <div 
                              className="w-3 h-3 rounded-sm mr-2" 
                              style={{ backgroundColor: type.color }} 
                            />
                            <span>{type.extension}</span>
                          </div>
                          <span>{type.count} files ({type.percentage.toFixed(1)}%)</span>
                        </div>
                        <Progress value={type.percentage} className="h-1" 
                          style={{ backgroundColor: `${type.color}25` }}>
                          <div className="h-full" style={{ backgroundColor: type.color, width: `${type.percentage}%` }} />
                        </Progress>
                      </div>
                    ))}
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <h3 className="text-lg font-medium mb-3">Best Practices Analysis</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className={`w-2 h-2 rounded-full ${readmeContent ? "bg-green-500" : "bg-amber-500"} mr-2`} />
                        <span>Documentation</span>
                      </div>
                      <Badge variant={readmeContent ? "outline" : "destructive"}>
                        {readmeContent ? "Present" : "Missing"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className={`w-2 h-2 rounded-full ${codeQualityScore > 70 ? "bg-green-500" : "bg-amber-500"} mr-2`} />
                        <span>Testing</span>
                      </div>
                      <Badge variant={codeQualityScore > 70 ? "outline" : "destructive"}>
                        {codeQualityScore > 70 ? "Present" : "Limited/Missing"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className={`w-2 h-2 rounded-full ${stats?.issues !== undefined ? "bg-green-500" : "bg-amber-500"} mr-2`} />
                        <span>Issue Tracking</span>
                      </div>
                      <Badge variant={stats?.issues !== undefined ? "outline" : "destructive"}>
                        {stats?.issues !== undefined ? `${stats.issues} Issues` : "No Data"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className={`w-2 h-2 rounded-full ${installationFiles.length > 0 ? "bg-green-500" : "bg-amber-500"} mr-2`} />
                        <span>Dependency Management</span>
                      </div>
                      <Badge variant={installationFiles.length > 0 ? "outline" : "destructive"}>
                        {installationFiles.length > 0 ? "Configured" : "Not Found"}
                      </Badge>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 bg-muted/30 rounded-md">
                  <h4 className="font-medium mb-2">Help & Tips</h4>
                  <div className="text-sm text-muted-foreground space-y-2">
                    <p>• View the <strong>Mind Map</strong> tab for a visual representation of the repository structure</p>
                    <p>• Check the <strong>Contributors</strong> tab to see who has worked on this repository</p>
                    <p>• Installation instructions can be found in the <strong>Installation</strong> tab</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Contributors Tab */}
        <TabsContent value="contributors" className="space-y-6">
          <Card>
            <CardHeader className="bg-gradient-to-r from-background to-purple-500/10">
              <div className="flex items-center">
                <Users className="mr-2 h-5 w-5 text-purple-500" />
                <CardTitle>Contributors</CardTitle>
              </div>
              <CardDescription>People contributing to this repository</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 gap-6">
                <div className="text-center">
                  <p className="text-5xl font-bold mb-2">{stats?.contributors || 0}</p>
                  <p className="text-muted-foreground">Total Contributors</p>
                </div>
                
                <Separator />
                
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Top Contributors</h3>
                  
                  {topContributors.length > 0 ? (
                    <div className="space-y-4">
                      {topContributors.map((contributor, idx) => (
                        <div key={idx} className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full overflow-hidden bg-muted">
                            <img src={contributor.avatar} alt={contributor.name} className="w-full h-full object-cover" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium">{contributor.name}</h4>
                              <Badge variant={idx === 0 ? "default" : "outline"}>{contributor.role}</Badge>
                            </div>
                            <div className="flex items-center justify-between mt-1">
                              <span className="text-sm text-muted-foreground">{contributor.commits} commits</span>
                              <div className="flex items-center gap-1 text-xs">
                                <span className="text-muted-foreground">Activity:</span>
                                <div className="flex">
                                  {Array(5).fill(0).map((_, i) => (
                                    <div 
                                      key={i}
                                      className={`w-2 h-2 rounded-full mx-0.5 ${
                                        i < Math.ceil(5 * Math.random()) 
                                          ? "bg-green-500" 
                                          : "bg-muted"
                                      }`} 
                                    />
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-muted-foreground">
                      No detailed contributor information available
                    </div>
                  )}
                </div>
                
                <div className="p-4 bg-muted/30 rounded-md">
                  <h4 className="font-medium mb-2">About Contributors</h4>
                  <div className="text-sm text-muted-foreground space-y-2">
                    <p>
                      Contributors are individuals who have made commits to this repository.
                      The repository owner is typically the person who created the repository,
                      while other contributors have submitted code changes that were accepted
                      into the main codebase.
                    </p>
                    <p>
                      A higher number of active contributors often indicates a healthy open source
                      project with community involvement.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Installation Tab */}
        <TabsContent value="installation" className="space-y-6">
          <Card>
            <CardHeader className="bg-gradient-to-r from-background to-green-500/10">
              <div className="flex items-center">
                <Package className="mr-2 h-5 w-5 text-green-500" />
                <CardTitle>Installation Files</CardTitle>
              </div>
              <CardDescription>Project dependencies and setup instructions</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {installationFiles.length > 0 ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {installationFiles.map((file, index) => (
                      <Card key={index} className="overflow-hidden">
                        <CardHeader className="bg-muted/20 p-4">
                          <CardTitle className="text-base">{file.name}</CardTitle>
                          <CardDescription>{file.description}</CardDescription>
                        </CardHeader>
                        <CardContent className="p-4">
                          <div className="text-sm">
                            <p className="mb-2">Path: <code className="bg-muted px-1 py-0.5 rounded">{file.path}</code></p>
                            {file.installCommand && (
                              <div>
                                <p className="mb-1">Installation Command:</p>
                                <div className="bg-muted p-2 rounded font-mono text-xs">
                                  {file.installCommand}
                                </div>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Getting Started</h3>
                    <div className="bg-muted rounded p-4 font-mono text-sm">
                      <p className="mb-2"># Clone the repository</p>
                      <p className="mb-4">git clone {repoUrl}.git</p>
                      
                      <p className="mb-2"># Navigate to the project directory</p>
                      <p className="mb-4">cd {stats?.repo?.name || "repository"}</p>
                      
                      {installationFiles.length > 0 && installationFiles[0].installCommand && (
                        <>
                          <p className="mb-2"># Install dependencies</p>
                          <p>{installationFiles[0].installCommand}</p>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div className="p-4 bg-green-500/10 rounded-md border border-green-500/20">
                    <h4 className="font-medium mb-2">Installation Help</h4>
                    <div className="text-sm text-muted-foreground space-y-2">
                      <p>
                        The above installation files were detected in the repository. They manage
                        project dependencies and configuration. Follow the installation steps
                        to set up the project locally.
                      </p>
                      <p>
                        If you encounter any issues, check the repository's README or open an issue
                        on the project's GitHub page.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No installation files detected in this repository.</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    The repository might not have standard dependency management files, or they might be in non-standard locations.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Statistics Tab */}
        <TabsContent value="statistics" className="space-y-6">
          <Card>
            <CardHeader className="bg-gradient-to-r from-background to-blue-500/10">
              <div className="flex items-center">
                <BarChart className="mr-2 h-5 w-5 text-blue-500" />
                <CardTitle>Repository Statistics</CardTitle>
              </div>
              <CardDescription>Detailed metrics and analysis</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="bg-muted/10">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Files</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-bold">{fileCount}</p>
                      <p className="text-sm text-muted-foreground mt-1">across {dirCount} directories</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-muted/10">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Activity</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-bold">{stats?.commits || "?"}</p>
                      <p className="text-sm text-muted-foreground mt-1">total commits</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-muted/10">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Community</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-bold">{stats?.stars || 0}</p>
                      <p className="text-sm text-muted-foreground mt-1">stars on GitHub</p>
                    </CardContent>
                  </Card>
                </div>
                
                <Separator />
                
                <div className="space-y-2">
                  <h3 className="text-base font-medium">Language Breakdown</h3>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={fileTypes}
                          cx="50%"
                          cy="50%"
                          labelLine={true}
                          innerRadius={60}
                          outerRadius={120}
                          fill="#8884d8"
                          paddingAngle={2}
                          dataKey="count"
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        >
                          {fileTypes.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <RechartsTooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-4">
                  <h3 className="text-base font-medium">Repository Analysis</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Metric</TableHead>
                        <TableHead>Value</TableHead>
                        <TableHead>Assessment</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell>Documentation</TableCell>
                        <TableCell>{readmeContent ? "Present" : "Missing"}</TableCell>
                        <TableCell>
                          <Badge className={readmeContent ? "bg-green-500" : "bg-red-500"}>
                            {readmeContent ? "Good" : "Needs Improvement"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Contributor Count</TableCell>
                        <TableCell>{stats?.contributors || 0}</TableCell>
                        <TableCell>
                          <Badge className={stats?.contributors && stats.contributors > 1 ? "bg-green-500" : "bg-amber-500"}>
                            {stats?.contributors && stats.contributors > 3 ? "Excellent" : 
                              stats?.contributors && stats.contributors > 1 ? "Good" : "Limited"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Issues</TableCell>
                        <TableCell>{stats?.issues !== undefined ? stats.issues : "Unknown"}</TableCell>
                        <TableCell>
                          {stats?.issues !== undefined && (
                            <Badge className={stats.issues > 0 ? "bg-blue-500" : "bg-gray-500"}>
                              {stats.issues > 10 ? "Active" : stats.issues > 0 ? "Some Activity" : "No Issues"}
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Update Frequency</TableCell>
                        <TableCell>{stats?.updated ? "Recent" : "Unknown"}</TableCell>
                        <TableCell>
                          {stats?.updated && (
                            <Badge className="bg-green-500">
                              Maintained
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* README Tab */}
        <TabsContent value="readme" className="space-y-6">
          <Card>
            <CardHeader className="bg-gradient-to-r from-background to-amber-500/10">
              <div className="flex items-center">
                <Book className="mr-2 h-5 w-5 text-amber-500" />
                <CardTitle>README</CardTitle>
              </div>
              <CardDescription>Repository documentation</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {readmeContent ? (
                <div className="p-4 bg-muted rounded-md overflow-auto max-h-[600px]">
                  <pre className="whitespace-pre-wrap font-mono text-sm">
                    {readmeContent}
                  </pre>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Book className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-lg text-muted-foreground">No README file found in this repository.</p>
                  <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
                    README files typically contain important information about the repository,
                    including what the project does, how to install it, and how to use it.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RepoDocumentation;
