import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Users, GitCommit, Calendar, ExternalLink } from "lucide-react";

interface Contributor {
  login: string;
  avatar_url: string;
  contributions: number;
  html_url: string;
}

interface ContributorsTabProps {
  contributors: Contributor[];
  stats: {
    totalContributors: number;
    totalCommits: number;
    lastCommitDate: string;
  };
}

const ContributorsTab: React.FC<ContributorsTabProps> = ({
  contributors = [],
  stats
}) => {
  // Sort contributors by number of contributions
  const sortedContributors = [...contributors].sort((a, b) => b.contributions - a.contributions);
  const topContributors = sortedContributors.slice(0, 5);

  return (
    <Card>
      <CardHeader className="bg-gradient-to-r from-background to-blue-500/10">
        <div className="flex items-center">
          <Users className="mr-2 h-5 w-5 text-blue-500" />
          <CardTitle>Project Contributors</CardTitle>
        </div>
        <CardDescription>Community members who have contributed to this project</CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-muted/20 p-4 rounded-lg">
              <div className="flex items-center mb-2">
                <Users className="h-4 w-4 mr-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Total Contributors</p>
              </div>
              <p className="text-xl font-semibold">{stats?.totalContributors || 0}</p>
            </div>
            <div className="bg-muted/20 p-4 rounded-lg">
              <div className="flex items-center mb-2">
                <GitCommit className="h-4 w-4 mr-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Total Commits</p>
              </div>
              <p className="text-xl font-semibold">{stats?.totalCommits || 0}</p>
            </div>
            <div className="bg-muted/20 p-4 rounded-lg">
              <div className="flex items-center mb-2">
                <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Last Commit</p>
              </div>
              <p className="text-xl font-semibold">
                {stats?.lastCommitDate ? new Date(stats.lastCommitDate).toLocaleDateString() : "Unknown"}
              </p>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="text-lg font-medium mb-3">Top Contributors</h3>
            {topContributors && topContributors.length > 0 ? (
              <div className="space-y-4">
                {topContributors.map((contributor, index) => (
                  <div key={contributor.login} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Avatar>
                        <AvatarImage src={contributor.avatar_url} alt={contributor.login} />
                        <AvatarFallback>{contributor.login.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <a 
                          href={contributor.html_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium hover:underline flex items-center"
                        >
                          {contributor.login}
                          <ExternalLink className="h-3 w-3 ml-1" />
                        </a>
                        <p className="text-sm text-muted-foreground">
                          {contributor.contributions} contributions
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline">#{index + 1}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-muted-foreground">No contributors found</p>
              </div>
            )}
          </div>

          <Separator />

          <div>
            <h3 className="text-lg font-medium mb-3">All Contributors</h3>
            {contributors && contributors.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {contributors.map((contributor) => (
                  <div key={contributor.login} className="flex items-center space-x-3 p-3 bg-muted/20 rounded-lg">
                    <Avatar>
                      <AvatarImage src={contributor.avatar_url} alt={contributor.login} />
                      <AvatarFallback>{contributor.login.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <a 
                        href={contributor.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium hover:underline flex items-center truncate"
                      >
                        {contributor.login}
                        <ExternalLink className="h-3 w-3 ml-1 flex-shrink-0" />
                      </a>
                      <p className="text-sm text-muted-foreground truncate">
                        {contributor.contributions} contributions
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-muted-foreground">No contributors found</p>
              </div>
            )}
          </div>

          <div className="p-4 bg-muted/30 rounded-md">
            <h4 className="font-medium mb-2">Contribution Guidelines</h4>
            <div className="space-y-2 text-sm">
              <p>Want to contribute to this project? Here's how you can get started:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Check the README.md for setup instructions</li>
                <li>Review the project structure and coding standards</li>
                <li>Look for issues labeled "good first issue" or "help wanted"</li>
                <li>Fork the repository and create a new branch</li>
                <li>Submit a pull request with your changes</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ContributorsTab; 