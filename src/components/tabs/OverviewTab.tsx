import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  BookOpen, Download, Star, GitBranch, Code, Users, 
  Calendar, Clock, FileCode, Activity, Folder, GitCommit 
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip } from 'recharts';
import { RepoStats } from "@/services/githubService";

interface OverviewTabProps {
  stats: RepoStats | null;
  fileCount: number;
  dirCount: number;
  fileTypes: Array<{
    extension: string;
    count: number;
    percentage: number;
    color: string;
  }>;
  readmeContent: string | null;
  installationFiles: Array<{
    name: string;
    path: string;
    description: string;
    content?: string;
    installCommand?: string;
  }>;
  commitActivity: Array<{
    day: string;
    commits: number;
  }>;
  healthScore: number;
  codeQualityScore: number;
  handleDownload: () => void;
}

const OverviewTab: React.FC<OverviewTabProps> = ({
  stats,
  fileCount,
  dirCount,
  fileTypes,
  readmeContent,
  installationFiles,
  commitActivity,
  healthScore,
  codeQualityScore,
  handleDownload
}) => {
  return (
    <div className="space-y-6">
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
                    git clone {stats?.repo?.html_url}.git<br/>
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
    </div>
  );
};

export default OverviewTab; 