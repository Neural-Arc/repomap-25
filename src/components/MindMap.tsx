import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { 
  Download, Share, Folder, File, FileCode, Search, 
  Filter, ArrowDown, ArrowRight, Code, Calendar, 
  User, Clock, GitCommit, X, ZoomIn, ZoomOut, Maximize
} from "lucide-react";
import { toast } from "sonner";
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  NodeProps,
  Panel,
  NodeMouseHandler,
  BackgroundVariant,
  MarkerType,
  useReactFlow,
  ReactFlowProvider
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useApi } from "@/contexts/ApiContext";
import { RepoNode, fetchRepositoryData, convertRepoDataToNodes, getRepoDownloadUrl } from "@/services/githubService";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from "@/components/ui/sheet";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";

interface MindMapProps {
  repoUrl: string;
}

interface NodeData {
  label: string;
  type: string;
  path?: string;
  extension?: string;
  size?: number;
  language?: string;
  lastCommitDate?: string;
  contributors?: string[];
  description?: string;
}

interface FileDetailProps {
  node: Node<NodeData>;
  onClose: () => void;
}

// Modern glass-morphism style color scheme
const NODE_COLORS = {
  directory: {
    border: 'rgba(139, 92, 246, 0.6)',
    background: 'from-purple-600/20 to-indigo-600/10',
    glow: '0 0 15px rgba(139, 92, 246, 0.5)',
    text: 'text-white',
    icon: 'text-purple-300'
  },
  file: {
    border: 'rgba(16, 185, 129, 0.6)',
    background: 'from-emerald-600/20 to-teal-600/10',
    glow: '0 0 15px rgba(16, 185, 129, 0.5)',
    text: 'text-white',
    icon: 'text-emerald-300'
  },
  function: {
    border: 'rgba(99, 102, 241, 0.6)',
    background: 'from-blue-600/20 to-indigo-600/10',
    glow: '0 0 15px rgba(99, 102, 241, 0.5)',
    text: 'text-white',
    icon: 'text-blue-300'
  }
};

// File extension colors
const EXTENSION_COLORS = {
  js: '#f7df1e',
  jsx: '#61dafb',
  ts: '#3178c6',
  tsx: '#3178c6',
  css: '#264de4',
  scss: '#cc6699',
  html: '#e34f26',
  json: '#5a9b44',
  md: '#9e70b2',
  py: '#3776ab',
  rb: '#cc342d',
  go: '#00add8',
  java: '#007396',
  php: '#777bb4',
  default: '#94a3b8'
};

// Custom node components with modern glass-morphism style
const DirectoryNode = ({ data, isConnectable, id }: NodeProps) => {
  return (
    <div className="group relative">
      <div 
        style={{ 
          boxShadow: NODE_COLORS.directory.glow,
          borderColor: NODE_COLORS.directory.border,
          backdropFilter: 'blur(5px)'
        }}
        className={`px-5 py-4 rounded-lg border border-opacity-60 bg-gradient-to-br ${NODE_COLORS.directory.background} transition-all duration-300 group-hover:shadow-xl min-w-[180px] z-10`}
      >
        <div className="flex items-center gap-2">
          <div className="bg-purple-900/40 p-2 rounded-md">
            <Folder className={`${NODE_COLORS.directory.icon} w-5 h-5`} />
          </div>
          <div className="flex flex-col">
            <span className={`font-medium ${NODE_COLORS.directory.text}`}>{data.label}</span>
            {data.type === 'directory' && (
              <Badge variant="outline" className="text-[0.65rem] bg-purple-900/40 text-purple-100 border-purple-400/30 mt-1">
                directory
              </Badge>
            )}
          </div>
        </div>
      </div>
      <div className="absolute inset-0 bg-purple-500/10 rounded-lg -z-10 blur-md opacity-0 group-hover:opacity-100 transition-opacity"></div>
    </div>
  );
};

const FileNode = ({ data, isConnectable, id }: NodeProps) => {
  const extension = data.path?.split('.').pop() || '';
  
  // Determine color based on file extension
  const getFileColor = () => {
    const extColor = EXTENSION_COLORS[extension as keyof typeof EXTENSION_COLORS];
    return extColor || EXTENSION_COLORS.default;
  };
  
  const fileColor = getFileColor();
  
  return (
    <div className="group relative">
      <div 
        style={{ 
          boxShadow: NODE_COLORS.file.glow,
          borderColor: NODE_COLORS.file.border,
          backdropFilter: 'blur(5px)'
        }}
        className={`px-5 py-4 rounded-lg border border-opacity-60 bg-gradient-to-br ${NODE_COLORS.file.background} transition-all duration-300 group-hover:shadow-xl min-w-[180px] z-10`}
      >
        <div className="flex items-center gap-2">
          <div className="bg-emerald-900/40 p-2 rounded-md">
            <FileCode style={{ color: fileColor }} className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className={`font-medium ${NODE_COLORS.file.text}`}>{data.label}</span>
            {extension && (
              <Badge variant="outline" className="text-[0.65rem] bg-emerald-900/40 text-emerald-100 border-emerald-400/30 mt-1">
                {extension}
              </Badge>
            )}
          </div>
        </div>
      </div>
      <div className="absolute inset-0 bg-emerald-500/10 rounded-lg -z-10 blur-md opacity-0 group-hover:opacity-100 transition-opacity"></div>
    </div>
  );
};

const FunctionNode = ({ data, isConnectable, id }: NodeProps) => {
  return (
    <div className="group relative">
      <div 
        style={{ 
          boxShadow: NODE_COLORS.function.glow,
          borderColor: NODE_COLORS.function.border,
          backdropFilter: 'blur(5px)'
        }}
        className={`px-5 py-4 rounded-lg border border-opacity-60 bg-gradient-to-br ${NODE_COLORS.function.background} transition-all duration-300 group-hover:shadow-xl min-w-[180px] z-10`}
      >
        <div className="flex items-center gap-2">
          <div className="bg-blue-900/40 p-2 rounded-md">
            <Code className={`${NODE_COLORS.function.icon} w-5 h-5`} />
          </div>
          <div className="flex flex-col">
            <span className={`font-medium ${NODE_COLORS.function.text}`}>{data.label}</span>
            <Badge variant="outline" className="text-[0.65rem] bg-blue-900/40 text-blue-100 border-blue-400/30 mt-1">
              function
            </Badge>
          </div>
        </div>
      </div>
      <div className="absolute inset-0 bg-blue-500/10 rounded-lg -z-10 blur-md opacity-0 group-hover:opacity-100 transition-opacity"></div>
    </div>
  );
};

const FileDetailsPanel: React.FC<FileDetailProps> = ({ node, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState("");
  
  // Mock data for file details - in a real implementation, this would come from API
  const mockData = useMemo(() => ({
    lastModified: "3 days ago",
    contributors: ["John Doe", "Jane Smith"],
    commits: Math.floor(Math.random() * 20) + 1,
    size: Math.floor(Math.random() * 2000) + 100 + " KB",
    lines: Math.floor(Math.random() * 1000) + 50,
    quality: Math.floor(Math.random() * 30) + 70,
    description: node.data.type === "directory" 
      ? `This directory contains ${Math.floor(Math.random() * 10) + 1} files and handles ${node.data.label} functionality.` 
      : `This file is responsible for ${node.data.label} functionality. It defines core logic for working with this feature.`
  }), [node]);
  
  useEffect(() => {
    if (node.data.type === "file") {
      setLoading(true);
      // Simulate loading content
      setTimeout(() => {
        setContent(`// Sample content for ${node.data.label}\n\n// This is a simplified representation of what might be in this file\n\nfunction example() {\n  console.log("This is an example");\n  return true;\n}`);
        setLoading(false);
      }, 500);
    }
  }, [node]);
  
  return (
    <ScrollArea className="h-full max-h-[calc(100vh-150px)]">
      <div className="p-6">
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center">
            {node.data.type === "directory" ? (
              <Folder className="mr-2 h-6 w-6 text-primary" />
            ) : (
              <FileCode className="mr-2 h-6 w-6 text-primary" />
            )}
            <div>
              <h2 className="text-xl font-semibold">{node.data.label}</h2>
              <p className="text-muted-foreground">{node.data.path || "Unknown path"}</p>
            </div>
          </div>
        </div>
        
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Last Modified</div>
              <div className="flex items-center">
                <Clock className="mr-1 h-3 w-3 text-muted-foreground" />
                <span className="text-sm">{mockData.lastModified}</span>
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Commits</div>
              <div className="flex items-center">
                <GitCommit className="mr-1 h-3 w-3 text-muted-foreground" />
                <span className="text-sm">{mockData.commits}</span>
              </div>
            </div>
            {node.data.type === "file" && (
              <>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Size</div>
                  <span className="text-sm">{mockData.size}</span>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Lines</div>
                  <span className="text-sm">{mockData.lines}</span>
                </div>
              </>
            )}
          </div>
          
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Contributors</h4>
            <div className="flex flex-wrap gap-2">
              {mockData.contributors.map((contributor, idx) => (
                <div key={idx} className="flex items-center gap-1 bg-muted/30 px-2 py-1 rounded text-xs">
                  <User className="h-3 w-3" />
                  {contributor}
                </div>
              ))}
            </div>
          </div>
          
          {node.data.type === "file" && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Code Quality</h4>
              <div className="flex justify-between text-xs">
                <span>Quality Score</span>
                <span>{mockData.quality}%</span>
              </div>
              <Progress value={mockData.quality} className="h-1" />
            </div>
          )}
          
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Description</h4>
            <p className="text-sm text-muted-foreground">{mockData.description}</p>
          </div>
          
          {node.data.type === "file" && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">File Preview</h4>
              {loading ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-4 w-4/6" />
                </div>
              ) : (
                <div className="bg-muted/40 p-3 rounded-md overflow-auto max-h-48">
                  <pre className="text-xs whitespace-pre-wrap">{content}</pre>
                </div>
              )}
            </div>
          )}
          
          <div className="pt-4 flex justify-between">
            <Badge variant="outline">{node.data.type}</Badge>
            {node.data.extension && <Badge>{node.data.extension}</Badge>}
          </div>
        </div>
      </div>
    </ScrollArea>
  );
};

// Convert RepoNode structure to ReactFlow nodes and edges with enhanced styling
const convertToFlowElements = (repoData: RepoNode | null): { nodes: Node[], edges: Edge[] } => {
  if (!repoData) return { nodes: [], edges: [] };
  
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  
  // Helper function to recursively process nodes
  const processNode = (node: RepoNode, position: { x: number, y: number }, level: number = 0): void => {
    // Add the current node
    const nodeType = getNodeType(node.type);
    const extension = node.path ? node.path.split('.').pop() : undefined;
    
    nodes.push({
      id: node.id,
      data: { 
        label: node.label, 
        type: node.type,
        path: node.path,
        extension
      },
      type: nodeType,
      position,
      style: {
        width: getNodeWidth(node.label, node.type),
      }
    });
    
    // If node has children and isn't collapsed, process them
    if (node.children && node.children.length > 0 && !node.collapsed) {
      const childCount = node.children.length;
      const horizontalGap = 350; // Increased spacing between nodes horizontally
      const verticalGap = 200; // Increased spacing between nodes vertically
      
      // Calculate starting position for children
      let startX = position.x - ((childCount - 1) * horizontalGap) / 2;
      const childY = position.y + verticalGap;
      
      node.children.forEach((child, index) => {
        const childPos = { x: startX + index * horizontalGap, y: childY };
        processNode(child, childPos, level + 1);
        
        // Add edge from parent to child with enhanced styling
        edges.push({
          id: `e${node.id}-${child.id}`,
          source: node.id,
          target: child.id,
          animated: child.type === "function",
          style: { 
            stroke: getEdgeColor(child.type),
            strokeWidth: 3,
            opacity: 0.8,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: getEdgeColor(child.type),
            width: 20,
            height: 20,
          },
          // Use smoothstep edge for better visualization
          type: 'smoothstep',
          // Removed the 'curvature' property as it's not supported
        });
      });
    }
  };
  
  // Start processing from the root node
  processNode(repoData, { x: 0, y: 0 });
  
  return { nodes, edges };
};

// Helper functions for node styling
const getNodeType = (type: string): string => {
  switch (type) {
    case "directory": return "directory";
    case "file": return "file";
    case "function": return "function";
    default: return "default";
  }
};

const getNodeWidth = (label: string, type: string): number => {
  const baseWidth = 180;
  const charWidth = 10;
  return Math.max(baseWidth, label.length * charWidth);
};

const getEdgeColor = (type: string): string => {
  switch (type) {
    case "directory": return "rgba(139, 92, 246, 0.8)";
    case "file": return "rgba(16, 185, 129, 0.8)";
    case "function": return "rgba(99, 102, 241, 0.8)";
    default: return "rgba(148, 163, 184, 0.8)";
  }
};

// The main component that uses React Flow hooks
const MindMapContent: React.FC<MindMapProps> = ({ repoUrl }) => {
  const { gitHubApiKey } = useApi();
  const [rootNode, setRootNode] = useState<RepoNode | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [isDetailSheetOpen, setIsDetailSheetOpen] = useState<boolean>(false);
  const [filterType, setFilterType] = useState<string | null>(null);
  const [visibleFileTypes, setVisibleFileTypes] = useState<Set<string>>(new Set());
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const reactFlowInstance = useReactFlow();

  useEffect(() => {
    // Fetch real data from GitHub API
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const repoData = await fetchRepositoryData(repoUrl, gitHubApiKey);
        
        if (repoData) {
          const rootNode = convertRepoDataToNodes(repoData);
          setRootNode(rootNode);
          
          // Collect all file extensions
          const allTypes = new Set<string>();
          Object.values(repoData.files).flat().forEach(file => {
            if (file.type === 'file') {
              const extension = file.path.split('.').pop() || 'unknown';
              allTypes.add(extension);
            }
          });
          setVisibleFileTypes(allTypes);
          
          // Convert to ReactFlow format
          const flowElements = convertToFlowElements(rootNode);
          setNodes(flowElements.nodes);
          setEdges(flowElements.edges);

          // Give a small delay to ensure nodes are rendered before fitting view
          setTimeout(() => {
            reactFlowInstance.fitView({
              padding: 0.5,
              duration: 1000,
              minZoom: 0.5,
              maxZoom: 2,
            });
          }, 300);
        } else {
          setError("Failed to fetch repository data");
        }
      } catch (error) {
        console.error("Error in MindMap component:", error);
        setError("An error occurred while processing repository data");
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [repoUrl, gitHubApiKey, setNodes, setEdges, reactFlowInstance]);

  const onConnect = useCallback(
    (connection: Connection) => setEdges((eds) => addEdge({
      ...connection,
      animated: true,
      style: { stroke: 'rgba(139, 92, 246, 0.8)', strokeWidth: 3 },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: 'rgba(139, 92, 246, 0.8)',
      },
      type: 'smoothstep'
    }, eds)),
    [setEdges]
  );

  const handleToggleNode = useCallback((nodeId: string) => {
    const toggleNode = (node: RepoNode): RepoNode => {
      if (node.id === nodeId) {
        return { ...node, collapsed: !node.collapsed };
      }
      
      if (node.children.length > 0) {
        return {
          ...node,
          children: node.children.map(child => toggleNode(child))
        };
      }
      
      return node;
    };
    
    if (rootNode) {
      const updatedRootNode = toggleNode(rootNode);
      setRootNode(updatedRootNode);
      
      // Update flow elements
      const flowElements = convertToFlowElements(updatedRootNode);
      setNodes(flowElements.nodes);
      setEdges(flowElements.edges);
      
      // Re-fit view after toggling with a smoother animation
      setTimeout(() => {
        reactFlowInstance.fitView({
          padding: 0.4,
          duration: 800
        });
      }, 100);
    }
  }, [rootNode, setNodes, setEdges, reactFlowInstance]);

  const handleDownload = () => {
    const downloadUrl = getRepoDownloadUrl(repoUrl);
    
    if (downloadUrl) {
      window.open(downloadUrl, '_blank');
      toast.success("Download started!");
    } else {
      toast.error("Could not generate download link");
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Share link copied to clipboard!");
  };

  const onNodeClick: NodeMouseHandler = useCallback((event, node) => {
    setSelectedNode(node);
    
    // If the node is clicked with Alt key, expand/collapse
    if (event.altKey && node.data.type === 'directory') {
      handleToggleNode(node.id);
    } else {
      // Open detailed view
      setIsDetailSheetOpen(true);
    }
  }, [handleToggleNode]);

  const zoomToNode = useCallback((nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (node) {
      reactFlowInstance.fitView({ 
        nodes: [node],
        duration: 800,
        padding: 0.3
      });
    }
  }, [nodes, reactFlowInstance]);
  
  const handleZoomIn = () => {
    reactFlowInstance.zoomIn({ duration: 300 });
    setZoomLevel(prev => Math.min(prev + 0.25, reactFlowInstance.getZoom()));
  };
  
  const handleZoomOut = () => {
    reactFlowInstance.zoomOut({ duration: 300 });
    setZoomLevel(prev => Math.max(prev - 0.25, reactFlowInstance.getZoom()));
  };
  
  const handleResetView = () => {
    reactFlowInstance.fitView({ duration: 800, padding: 0.4 });
    setZoomLevel(reactFlowInstance.getZoom());
  };

  // Filter nodes based on search term and filter type
  const filteredNodes = useMemo(() => {
    if (!searchTerm && !filterType) return nodes;
    
    return nodes.filter(node => {
      // Filter by search term
      const matchesSearch = searchTerm ? 
        node.data.label.toLowerCase().includes(searchTerm.toLowerCase()) : 
        true;
      
      // Filter by file type
      const matchesFilter = filterType ? 
        (filterType === 'directory' ? node.data.type === 'directory' : 
         node.data.extension === filterType) : 
        true;
        
      return matchesSearch && matchesFilter;
    });
  }, [nodes, searchTerm, filterType]);

  // Register custom node types
  const nodeTypes = useMemo(() => ({
    directory: DirectoryNode,
    file: FileNode,
    function: FunctionNode
  }), []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[600px]">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="mt-4 text-muted-foreground">Fetching repository structure...</p>
          <div className="mt-8 space-y-4 w-96">
            <Skeleton className="h-8 w-full" />
            <div className="flex space-x-4">
              <Skeleton className="h-36 w-36 rounded-md" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-6 w-1/2" />
                <Skeleton className="h-6 w-5/6" />
              </div>
            </div>
            <Skeleton className="h-36 w-full rounded-md" />
          </div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex items-center justify-center h-full min-h-[500px]">
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
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center p-4 border-b border-muted mb-4">
        <h2 className="text-lg font-semibold">Repository Structure</h2>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleDownload}
            className="flex items-center"
          >
            <Download size={16} className="mr-2" />
            Download
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleShare}
            className="flex items-center"
          >
            <Share size={16} className="mr-2" />
            Share
          </Button>
        </div>
      </div>

      <div className="flex-grow h-[700px] border rounded-md relative overflow-hidden">
        <ReactFlow
          nodes={filteredNodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          onNodeClick={onNodeClick}
          fitView
          fitViewOptions={{
            padding: 0.5,
            minZoom: 0.4,
            maxZoom: 2,
            duration: 1000,
          }}
          attributionPosition="bottom-right"
          minZoom={0.2}
          maxZoom={3}
          defaultEdgeOptions={{ 
            type: 'smoothstep',
            animated: true,
            style: { strokeWidth: 3 }
          }}
          className="bg-gradient-to-br from-gray-950 via-slate-900 to-gray-900"
        >
          {/* Search panel centered */}
          <Panel position="top-center" className="bg-black/50 backdrop-blur-lg p-4 rounded-lg border border-slate-700/50 w-full max-w-md mt-2 shadow-xl">
            <div className="flex flex-col space-y-3">
              <div className="flex items-center space-x-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search files..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-9 text-sm bg-gray-900/70 border-slate-700"
                />
              </div>
              <div className="flex items-center space-x-1 flex-wrap gap-1">
                <Filter className="h-4 w-4 text-muted-foreground mr-1" />
                <Button
                  variant={!filterType ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => setFilterType(null)}
                  className="text-xs py-0 h-6"
                >
                  All
                </Button>
                <Button
                  variant={filterType === 'directory' ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => setFilterType('directory')}
                  className="text-xs py-0 h-6"
                >
                  <Folder className="h-3 w-3 mr-1" />Dirs
                </Button>
                {Array.from(visibleFileTypes).slice(0, 5).map(ext => (
                  <Button
                    key={ext}
                    variant={filterType === ext ? "secondary" : "outline"}
                    size="sm"
                    onClick={() => setFilterType(ext)}
                    className="text-xs py-0 h-6"
                  >
                    <File className="h-3 w-3 mr-1" />.{ext}
                  </Button>
                ))}
                {visibleFileTypes.size > 5 && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" size="sm" className="text-xs py-0 h-6">
                          +{visibleFileTypes.size - 5}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="p-1 grid grid-cols-3 gap-1">
                          {Array.from(visibleFileTypes).slice(5).map(ext => (
                            <Badge 
                              key={ext} 
                              variant="outline" 
                              className="cursor-pointer"
                              onClick={() => setFilterType(ext)}
                            >
                              .{ext}
                            </Badge>
                          ))}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            </div>
          </Panel>

          {selectedNode && !isDetailSheetOpen && (
            <Panel position="bottom-center" className="bg-black/50 backdrop-blur-lg p-4 rounded-lg border border-slate-700/50 max-w-lg mb-4 text-white">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold">{selectedNode.data.label}</h3>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 w-6 p-0 text-white/70 hover:text-white" 
                  onClick={() => setSelectedNode(null)}
                >
                  <X size={14} />
                </Button>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Type:</span>
                  <Badge variant={selectedNode.data.type === 'directory' ? "secondary" : "outline"}>
                    {selectedNode.data.type}
                  </Badge>
                </div>
                
                {selectedNode.data.path && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">Path:</span>
                    <span className="text-xs bg-gray-800/70 px-2 py-1 rounded">{selectedNode.data.path}</span>
                  </div>
                )}
                
                {selectedNode.data.extension && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">Extension:</span>
                    <Badge>.{selectedNode.data.extension}</Badge>
                  </div>
                )}
                
                <div className="flex justify-between gap-2 mt-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-xs h-7 flex-1 bg-gray-800/50 border-slate-700 hover:bg-gray-700 text-gray-200"
                    onClick={() => zoomToNode(selectedNode.id)} 
                  >
                    Focus
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-xs h-7 flex-1 bg-gray-800/50 border-slate-700 hover:bg-gray-700 text-gray-200"
                    onClick={() => setIsDetailSheetOpen(true)} 
                  >
                    View Details
                  </Button>
                  
                  {selectedNode.data.type === 'directory' && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-xs h-7 flex-1 bg-gray-800/50 border-slate-700 hover:bg-gray-700 text-gray-200"
                      onClick={() => handleToggleNode(selectedNode.id)} 
                    >
                      {rootNode?.collapsed ? (
                        <ArrowRight className="h-3 w-3 mr-1" />
                      ) : (
                        <ArrowDown className="h-3 w-3 mr-1" />
                      )}
                      {rootNode?.collapsed ? 'Expand' : 'Collapse'}
                    </Button>
                  )}
                </div>
              </div>
            </Panel>
          )}
          
          {/* Zoom controls moved to top-right */}
          <Panel position="top-right" className="bg-black/50 backdrop-blur-lg p-2 rounded-lg border border-slate-700/50 mt-2 mr-2">
            <div className="flex gap-1">
              <Button 
                variant="outline" 
                size="icon" 
                className="h-8 w-8 bg-gray-800/50 border-slate-700 hover:bg-gray-700 text-gray-200" 
                onClick={handleZoomIn}
              >
                <ZoomIn size={16} />
              </Button>
              <Button 
                variant="outline" 
                size="icon" 
                className="h-8 w-8 bg-gray-800/50 border-slate-700 hover:bg-gray-700 text-gray-200" 
                onClick={handleZoomOut}
              >
                <ZoomOut size={16} />
              </Button>
              <Button 
                variant="outline" 
                size="icon" 
                className="h-8 w-8 bg-gray-800/50 border-slate-700 hover:bg-gray-700 text-gray-200" 
                onClick={handleResetView}
              >
                <Maximize size={16} />
              </Button>
            </div>
          </Panel>
          
          <Controls className="bg-black/50 backdrop-blur-lg border border-slate-700/50 shadow-lg rounded-md" />
          <MiniMap 
            nodeStrokeWidth={3}
            nodeColor={(node) => {
              if (node.type === 'directory') return 'rgba(139, 92, 246, 0.6)';
              if (node.type === 'file') return 'rgba(16, 185, 129, 0.6)';
              if (node.type === 'function') return 'rgba(99, 102, 241, 0.6)';
              return 'rgba(148, 163, 184, 0.6)';
            }}
            maskColor="rgba(0, 0, 0, 0.5)"
            className="bg-black/20 border-slate-700/50"
            style={{
              backgroundColor: 'transparent',
              width: 140,
              height: 100
            }}
          />
          <Background 
            color="rgba(255,255,255,0.07)" 
            gap={24} 
            size={1.5} 
            variant={BackgroundVariant.Dots} 
          />
        </ReactFlow>
      </div>
      
      {/* Details sheet that slides in from the side */}
      {selectedNode && (
        <Sheet open={isDetailSheetOpen} onOpenChange={setIsDetailSheetOpen}>
          <SheetContent side="right" className="w-full sm:max-w-lg p-0 overflow-hidden bg-gray-950/95 border-slate-800">
            <SheetHeader className="border-b border-slate-800 bg-gray-900/40 p-4">
              <SheetTitle className="flex items-center gap-2 text-white">
                {selectedNode.data.type === "directory" ? (
                  <Folder className="h-5 w-5 text-purple-400" />
                ) : (
                  <FileCode className="h-5 w-5 text-emerald-400" />
                )}
                {selectedNode.data.label}
              </SheetTitle>
              <SheetDescription className="text-gray-400">
                {selectedNode.data.path || "Path not available"}
              </SheetDescription>
            </SheetHeader>
            <FileDetailsPanel node={selectedNode} onClose={() => setIsDetailSheetOpen(false)} />
          </SheetContent>
        </Sheet>
      )}
      
      {/* Quick tips card */}
      <Card className="mt-6 border border-slate-800/50 bg-gray-900/30 text-white">
        <CardHeader className="pb-2 pt-4">
          <CardTitle className="text-lg">Mind Map Tips</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-gray-300">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="font-medium mb-1">Navigation:</p>
              <ul className="list-disc list-inside pl-2 space-y-1">
                <li>Click and drag to pan around</li>
                <li>Use scroll wheel to zoom</li>
                <li>Click on a node to see details</li>
              </ul>
            </div>
            <div>
              <p className="font-medium mb-1">Keyboard Shortcuts:</p>
              <ul className="list-disc list-inside pl-2 space-y-1">
                <li>Alt + Click on directories to expand/collapse</li>
                <li>Esc key to close any open panels</li>
                <li>Search by typing in the search box</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Wrapper component that provides the ReactFlowProvider
const MindMap: React.FC<MindMapProps> = (props) => {
  return (
    <ReactFlowProvider>
      <MindMapContent {...props} />
    </ReactFlowProvider>
  );
};

export default MindMap;
