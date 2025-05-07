import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { BarChart, Star, GitFork, GitCommit, GitPullRequest } from "lucide-react";
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface StatisticsTabProps {
  stats: {
    stars: number;
    forks: number;
    issues: number;
    pullRequests: number;
    commits: number;
    contributors: number;
    language: string;
    lastUpdated: string;
    createdAt: string;
  };
  commitActivity: Array<{
    date: string;
    commits: number;
  }>;
  languageStats: Array<{
    name: string;
    percentage: number;
    color: string;
  }>;
}

const StatisticsTab: React.FC<StatisticsTabProps> = ({
  stats,
  commitActivity = [],
  languageStats = []
}) => {
  return (
    <Card>
      <CardHeader className="bg-gradient-to-r from-background to-blue-500/10">
        <div className="flex items-center">
          <BarChart className="mr-2 h-5 w-5 text-blue-500" />
          <CardTitle>Repository Statistics</CardTitle>
        </div>
        <CardDescription>Key metrics and activity data</CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-muted/20 p-4 rounded-lg">
              <div className="flex items-center mb-2">
                <Star className="h-4 w-4 mr-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Stars</p>
              </div>
              <p className="text-xl font-semibold">{stats?.stars || 0}</p>
            </div>
            <div className="bg-muted/20 p-4 rounded-lg">
              <div className="flex items-center mb-2">
                <GitFork className="h-4 w-4 mr-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Forks</p>
              </div>
              <p className="text-xl font-semibold">{stats?.forks || 0}</p>
            </div>
            <div className="bg-muted/20 p-4 rounded-lg">
              <div className="flex items-center mb-2">
                <GitCommit className="h-4 w-4 mr-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Commits</p>
              </div>
              <p className="text-xl font-semibold">{stats?.commits || 0}</p>
            </div>
          </div>
          
          <Separator />
          
          <div>
            <h3 className="text-lg font-medium mb-3">Commit Activity</h3>
            {commitActivity && commitActivity.length > 0 ? (
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsBarChart data={commitActivity}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="commits" fill="#3b82f6" />
                  </RechartsBarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-muted-foreground">No commit activity data available</p>
              </div>
            )}
          </div>
          
          <Separator />
          
          <div>
            <h3 className="text-lg font-medium mb-3">Language Distribution</h3>
            {languageStats && languageStats.length > 0 ? (
              <div className="space-y-4">
                {languageStats.map((lang, index) => (
                  <div key={index} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <div className="flex items-center">
                        <div 
                          className="w-3 h-3 rounded-sm mr-2" 
                          style={{ backgroundColor: lang.color }} 
                        />
                        <span>{lang.name}</span>
                      </div>
                      <span>{lang.percentage.toFixed(1)}%</span>
                    </div>
                    <Progress value={lang.percentage} className="h-1" 
                      style={{ backgroundColor: `${lang.color}25` }}>
                      <div className="h-full" style={{ backgroundColor: lang.color, width: `${lang.percentage}%` }} />
                    </Progress>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-muted-foreground">No language statistics available</p>
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-muted/20 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">Created</p>
              <p className="font-medium">
                {stats?.createdAt ? new Date(stats.createdAt).toLocaleDateString() : "Unknown"}
              </p>
            </div>
            <div className="bg-muted/20 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">Last Updated</p>
              <p className="font-medium">
                {stats?.lastUpdated ? new Date(stats.lastUpdated).toLocaleDateString() : "Unknown"}
              </p>
            </div>
          </div>
          
          <div className="p-4 bg-muted/30 rounded-md">
            <h4 className="font-medium mb-2">Repository Health</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className={`w-2 h-2 rounded-full ${stats?.issues > 0 ? "bg-green-500" : "bg-amber-500"} mr-2`} />
                  <span>Issue Tracking</span>
                </div>
                <Badge variant={stats?.issues > 0 ? "outline" : "destructive"}>
                  {stats?.issues || 0} Issues
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className={`w-2 h-2 rounded-full ${stats?.pullRequests > 0 ? "bg-green-500" : "bg-amber-500"} mr-2`} />
                  <span>Pull Requests</span>
                </div>
                <Badge variant={stats?.pullRequests > 0 ? "outline" : "destructive"}>
                  {stats?.pullRequests || 0} PRs
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className={`w-2 h-2 rounded-full ${stats?.contributors > 1 ? "bg-green-500" : "bg-amber-500"} mr-2`} />
                  <span>Collaboration</span>
                </div>
                <Badge variant={stats?.contributors > 1 ? "outline" : "destructive"}>
                  {stats?.contributors || 0} Contributors
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default StatisticsTab; 