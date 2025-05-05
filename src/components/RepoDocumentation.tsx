
import React, { useState, useEffect } from "react";
import { Download, FileText, Code, TestTube, BarChart, Folder, Book, Users, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { useApi } from "@/contexts/ApiContext";
import { fetchRepositoryData, extractRepoStats, getRepoDownloadUrl, RepoStats } from "@/services/githubService";

interface RepoDocumentationProps {
  repoUrl: string;
}

interface FileTypeStats {
  extension: string;
  count: number;
  percentage: number;
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
          
          // Calculate file type statistics
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
          
          // Convert to array and calculate percentages
          const fileTypeStats: FileTypeStats[] = Object.entries(extensions)
            .map(([extension, count]) => ({
              extension,
              count,
              percentage: (count / totalFiles) * 100
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 6); // Get top 6 file types
          
          setFileTypes(fileTypeStats);
          setFileCount(totalFiles);
          setDirCount(totalDirs);
          
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
    <div className="space-y-8">
      {/* Repository Overview */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Repository Overview</CardTitle>
              <CardDescription>Key statistics and information</CardDescription>
            </div>
            <Button onClick={handleDownload} className="flex items-center">
              <Download size={16} className="mr-2" />
              Download Repository
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Stars</p>
              <p className="text-2xl font-bold">{stats?.stars || 0}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Forks</p>
              <p className="text-2xl font-bold">{stats?.forks || 0}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Issues</p>
              <p className="text-2xl font-bold">{stats?.issues || 0}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Contributors</p>
              <p className="text-2xl font-bold">{stats?.contributors || 0}</p>
            </div>
          </div>
          <Separator className="my-6" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Created</p>
              <p className="text-md font-semibold">{stats?.created || "Unknown"}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Last Updated</p>
              <p className="text-md font-semibold">{stats?.updated || "Unknown"}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Main Language</p>
              <p className="text-md font-semibold">{stats?.language || "Not specified"}</p>
            </div>
          </div>
          <Separator className="my-6" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Branches</p>
              <p className="text-2xl font-bold">{stats?.branches || 0}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Files</p>
              <p className="text-2xl font-bold">{stats?.totalFiles || 0}</p>
            </div>
          </div>
          <Separator className="my-6" />
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">Description</p>
            <p className="text-md">{stats?.description || "No description available"}</p>
          </div>
        </CardContent>
      </Card>

      {/* Repository Health */}
      <Card>
        <CardHeader>
          <div className="flex items-center">
            <Activity className="mr-2" size={20} />
            <CardTitle>Repository Health</CardTitle>
          </div>
          <CardDescription>Overall repository activity and maintenance metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Health Score</span>
                <span className="text-sm font-medium">{healthScore}%</span>
              </div>
              <Progress value={healthScore} className="h-2" />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium mb-2">Activity</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Last commit</span>
                    <span className="text-sm font-medium">{stats?.updated || "Unknown"}</span>
                  </div>
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
                <h4 className="text-sm font-medium mb-2">Community</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Documentation</span>
                    <span className="text-sm font-medium">{readmeContent ? "Available" : "Missing"}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Stars</span>
                    <span className="text-sm font-medium">{stats?.stars || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Contributors</span>
                    <span className="text-sm font-medium">{stats?.contributors || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contributors */}
      <Card>
        <CardHeader>
          <div className="flex items-center">
            <Users className="mr-2" size={20} />
            <CardTitle>Contributors</CardTitle>
          </div>
          <CardDescription>People contributing to this repository</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-4xl font-bold mb-2">{stats?.contributors || 0}</p>
            <p className="text-muted-foreground">Total Contributors</p>
          </div>
        </CardContent>
      </Card>

      {/* File Structure Analysis */}
      <Card>
        <CardHeader>
          <div className="flex items-center">
            <Folder className="mr-2" size={20} />
            <CardTitle>Repository Structure</CardTitle>
          </div>
          <CardDescription>Organization and composition of the repository</CardDescription>
        </CardHeader>
        <CardContent>
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
                <div className="space-y-3">
                  {fileTypes.map((type) => (
                    <div key={type.extension} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span>{type.extension} ({type.count} files)</span>
                        <span>{type.percentage.toFixed(1)}%</span>
                      </div>
                      <Progress value={type.percentage} className="h-1" />
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <p className="text-muted-foreground text-sm">
              View the visual mind map in the "Mind Map" tab for a complete overview of the repository structure.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Code Metrics */}
      <Card>
        <CardHeader>
          <div className="flex items-center">
            <BarChart className="mr-2" size={20} />
            <CardTitle>Code Metrics</CardTitle>
          </div>
          <CardDescription>Repository size and complexity metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-muted/20 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">Primary Language</p>
                <p className="text-xl font-semibold">{stats?.language || "Unknown"}</p>
              </div>
              <div className="bg-muted/20 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">Average File Size</p>
                <p className="text-xl font-semibold">
                  {stats?.totalFiles ? "~2KB" : "Unknown"}
                </p>
              </div>
              <div className="bg-muted/20 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">Complexity Estimate</p>
                <p className="text-xl font-semibold">
                  {stats?.totalFiles && stats.totalFiles > 100 ? "High" : stats?.totalFiles && stats.totalFiles > 50 ? "Medium" : "Low"}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* README Content */}
      <Card>
        <CardHeader>
          <div className="flex items-center">
            <Book className="mr-2" size={20} />
            <CardTitle>README</CardTitle>
          </div>
          <CardDescription>README content from the repository</CardDescription>
        </CardHeader>
        <CardContent>
          {readmeContent ? (
            <div className="p-4 bg-secondary rounded-md overflow-auto max-h-[400px]">
              <pre className="whitespace-pre-wrap font-mono text-sm">
                {readmeContent}
              </pre>
            </div>
          ) : (
            <p className="text-muted-foreground">No README file found in this repository.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RepoDocumentation;
