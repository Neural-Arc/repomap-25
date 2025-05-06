import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useApi } from "@/contexts/ApiContext";
import { toast } from "sonner";
import { 
  ChevronDown, ChevronRight, FolderIcon, FileIcon, Code, Download, Share, Search, 
  Filter, ZoomIn, ZoomOut, Maximize, X, FileCode, Info, 
  User, Clock, GitCommit, Folder, ExternalLink, 
} from "lucide-react";
import { fetchRepositoryData, parseGitHubUrl, getRepoDownloadUrl } from "@/services/githubService";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from "@/components/ui/sheet";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";

// Import D3.js for the force-directed graph
import * as d3 from "d3";

interface RepositoryVisualizerProps {
  repoUrl: string;
}

// Node types for our visualization
interface TreeNode {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  extension?: string;
  children: TreeNode[];
  collapsed?: boolean;
  color?: string;
  description?: string;
  commitCount?: number;
  lastModified?: string;
  contributors?: string[];
}

// D3 Graph link and node types
interface D3Node extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'directory';
  extension?: string;
  radius: number;
  color: string;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

interface D3Link extends d3.SimulationLinkDatum<D3Node> {
  source: string | D3Node;
  target: string | D3Node;
  value: number;
}

// File extension colors map
const FILE_EXTENSIONS_COLORS: Record<string, string> = {
  js: "#f7df1e",
  jsx: "#61dafb",
  ts: "#3178c6",
  tsx: "#61dafb",
  css: "#264de4",
  scss: "#cc6699",
  html: "#e34f26",
  json: "#5a9b44",
  md: "#9e70b2",
  py: "#3776ab",
  rb: "#cc342d",
  go: "#00add8",
  java: "#007396",
  php: "#777bb4",
  c: "#a8b9cc",
  cpp: "#00599c",
  cs: "#178600",
  swift: "#ffac45",
  kt: "#a97bff",
  rs: "#dea584",
  default: "#8e9196"
};

// Main component
const RepositoryVisualizer: React.FC<RepositoryVisualizerProps> = ({ repoUrl }) => {
  const { gitHubApiKey } = useApi();
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [rootNode, setRootNode] = useState<TreeNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string | null>(null);
  const [selectedView, setSelectedView] = useState<'tree' | 'graph'>('graph');
  const [isDetailSheetOpen, setIsDetailSheetOpen] = useState<boolean>(false);
  const [fileContent, setFileContent] = useState<string>("");
  const [fileContentLoading, setFileContentLoading] = useState<boolean>(false);
  
  const svgRef = useRef<SVGSVGElement>(null);
  const graphContainerRef = useRef<HTMLDivElement>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [simulation, setSimulation] = useState<d3.Simulation<D3Node, D3Link> | null>(null);
  const [nodes, setNodes] = useState<D3Node[]>([]);
  const [links, setLinks] = useState<D3Link[]>([]);
  const [highlightedNodes, setHighlightedNodes] = useState<Set<string>>(new Set());
  
  // Initialize the visualization
  useEffect(() => {
    const fetchRepo = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const repoInfo = parseGitHubUrl(repoUrl);
        if (!repoInfo) {
          setError("Invalid GitHub URL");
          setLoading(false);
          return;
        }
        
        // Add progress tracking
        const progressCallback = (completed: number, total: number, phase: number) => {
          // Update loading progress
          if (completed === total) {
            // Add a small delay before completing to ensure smooth transition
            setTimeout(() => {
              setLoading(false);
            }, 500);
          }
        };
        
        const data = await fetchRepositoryData(repoUrl, gitHubApiKey, progressCallback);
        
        if (!data) {
          setError("Failed to fetch repository data");
          setLoading(false);
          return;
        }
        
        // Convert the repository data to a tree structure
        const root = convertToTreeNode(data);
        setRootNode(root);
        
        // Create D3 nodes and links
        const { nodes, links } = convertToD3Graph(root);
        setNodes(nodes);
        setLinks(links);
        
        // Initialize force-directed graph
        if (selectedView === 'graph') {
          // Add a small delay to ensure the container is ready
          setTimeout(() => {
            initializeGraph(nodes, links);
            // Ensure loading is complete after graph initialization
            setLoading(false);
          }, 100);
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error("Error fetching repository:", error);
        setError("An error occurred while fetching the repository");
        setLoading(false);
      }
    };
    
    fetchRepo();
    
    // Cleanup
    return () => {
      if (simulation) {
        simulation.stop();
      }
    };
  }, [repoUrl, gitHubApiKey, selectedView]);
  
  // Initialize the force-directed graph
  const initializeGraph = useCallback((nodes: D3Node[], links: D3Link[]) => {
    if (!svgRef.current || !graphContainerRef.current) return;
    
    // Clear previous graph
    d3.select(svgRef.current).selectAll("*").remove();
    
    const width = graphContainerRef.current.clientWidth;
    const height = graphContainerRef.current.clientHeight || 600;
    
    // Create SVG with explicit dimensions and viewBox
    const svg = d3.select(svgRef.current)
      .attr("width", "100%")
      .attr("height", "100%")
      .attr("viewBox", [0, 0, width, height])
      .attr("preserveAspectRatio", "xMidYMid meet")
      .style("background", "transparent");
    
    // Create force simulation with adjusted parameters
    const sim = d3.forceSimulation<D3Node>(nodes)
      .force("link", d3.forceLink<D3Node, D3Link>(links).id(d => d.id).distance(150))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide<D3Node>().radius(d => d.radius + 30));
    
    // Add zoom behavior
    const zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
        setZoomLevel(event.transform.k);
      });
    
    svg.call(zoomBehavior);
    
    // Create main group for all elements
    const g = svg.append("g");
    
    // Create links with improved visibility
    const link = g.append("g")
      .attr("class", "links")
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke", "#999")
      .attr("stroke-opacity", 0.6)
      .attr("stroke-width", d => Math.sqrt(d.value) * 2)
      .attr("stroke-dasharray", "5,5");
    
    // Create node groups with improved visibility
    const node = g.append("g")
      .attr("class", "nodes")
      .selectAll(".node")
      .data(nodes)
      .join("g")
      .attr("class", "node")
      .attr("cursor", "pointer")
      .call(d3.drag<SVGGElement, D3Node>()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended) as any)
      .on("click", (event, d) => {
        const treeNode = findNodeById(rootNode, d.id);
        if (treeNode) {
          setSelectedNode(treeNode);
          setIsDetailSheetOpen(true);
        }
      })
      .on("mouseover", (event, d) => {
        const connected = new Set<string>([d.id]);
        links.forEach(link => {
          const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
          const targetId = typeof link.target === 'string' ? link.target : link.target.id;
          
          if (sourceId === d.id) connected.add(targetId);
          if (targetId === d.id) connected.add(sourceId);
        });
        
        setHighlightedNodes(connected);
        
        node.classed("node--highlighted", nd => connected.has(nd.id));
        link.classed("link--highlighted", l => {
          const sourceId = typeof l.source === 'string' ? l.source : l.source.id;
          const targetId = typeof l.target === 'string' ? l.target : l.target.id;
          return connected.has(sourceId) && connected.has(targetId);
        });
      })
      .on("mouseout", () => {
        setHighlightedNodes(new Set());
        node.classed("node--highlighted", false);
        link.classed("link--highlighted", false);
      });
    
    // Add circles to nodes with improved visibility
    node.append("circle")
      .attr("r", d => d.radius)
      .attr("fill", d => d.color)
      .attr("stroke", "#fff")
      .attr("stroke-width", 2)
      .attr("filter", "drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))");
    
    // Add icons to nodes
    node.append("text")
      .attr("dy", ".35em")
      .attr("text-anchor", "middle")
      .attr("fill", "#fff")
      .attr("font-family", "sans-serif")
      .attr("font-size", "12px")
      .text(d => d.type === 'directory' ? "📁" : getFileIcon(d.extension || ""));
    
    // Add labels to nodes with improved visibility
    node.append("text")
      .attr("dy", 30)
      .attr("text-anchor", "middle")
      .attr("fill", "#fff")
      .attr("font-family", "sans-serif")
      .attr("font-size", "12px")
      .attr("font-weight", "bold")
      .text(d => {
        const name = d.name;
        return name.length > 15 ? name.substring(0, 12) + '...' : name;
      })
      .attr("filter", "drop-shadow(0 1px 2px rgba(0, 0, 0, 0.7))");
    
    // Update positions on each tick
    sim.on("tick", () => {
      link
        .attr("x1", d => (d.source as D3Node).x!)
        .attr("y1", d => (d.source as D3Node).y!)
        .attr("x2", d => (d.target as D3Node).x!)
        .attr("y2", d => (d.target as D3Node).y!);
      
      node.attr("transform", d => `translate(${d.x},${d.y})`);
    });
    
    setSimulation(sim);
    
    // Initial zoom to fit
    const initialTransform = d3.zoomIdentity
      .translate(width / 2, height / 2)
      .scale(0.8);
    
    svg.call(zoomBehavior.transform as any, initialTransform);
    
    return () => {
      if (sim) {
        sim.stop();
      }
    };
  }, [rootNode]);
  
  // Handle window resize for responsive graph
  useEffect(() => {
    const handleResize = () => {
      if (simulation && nodes.length > 0 && links.length > 0) {
        initializeGraph(nodes, links);
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [simulation, nodes, links, initializeGraph]);
  
  // Helper function to find a node by ID
  const findNodeById = (node: TreeNode | null, id: string): TreeNode | null => {
    if (!node) return null;
    if (node.id === id) return node;
    
    for (const child of node.children) {
      const found = findNodeById(child, id);
      if (found) return found;
    }
    
    return null;
  };
  
  // Convert the repository data to a tree structure
  const convertToTreeNode = (data: any): TreeNode => {
    const { repo, files } = data;
    
    // Create the root node
    const root: TreeNode = {
      id: "root",
      name: repo.name,
      path: "",
      type: "directory",
      children: [],
      collapsed: false,
      description: repo.description || "No description available"
    };
    
    // Map to track created directories
    const directoryMap = new Map<string, TreeNode>();
    directoryMap.set("", root);
    
    // Process files
    Object.keys(files).forEach(dirPath => {
      const dirFiles = files[dirPath];
      
      // Ensure the directory exists
      let currentDir: TreeNode;
      
      if (dirPath === "") {
        currentDir = root;
      } else {
        // Create or get the directory node
        if (!directoryMap.has(dirPath)) {
          const parts = dirPath.split('/');
          const dirName = parts[parts.length - 1];
          
          const dirNode: TreeNode = {
            id: dirPath,
            name: dirName,
            path: dirPath,
            type: "directory",
            children: [],
            collapsed: true
          };
          
          // Link to parent directory
          const parentPath = parts.slice(0, -1).join('/');
          const parentDir = directoryMap.get(parentPath) || root;
          parentDir.children.push(dirNode);
          
          directoryMap.set(dirPath, dirNode);
        }
        
        currentDir = directoryMap.get(dirPath)!;
      }
      
      // Add files to the directory
      dirFiles.forEach((file: any) => {
        if (file.type === "file") {
          const nameParts = file.path.split('/');
          const fileName = nameParts[nameParts.length - 1];
          const extension = fileName.includes('.') ? fileName.split('.').pop() : '';
          
          const fileNode: TreeNode = {
            id: file.path,
            name: fileName,
            path: file.path,
            type: "file",
            extension,
            children: [],
            color: FILE_EXTENSIONS_COLORS[extension as keyof typeof FILE_EXTENSIONS_COLORS] || FILE_EXTENSIONS_COLORS.default,
            // Mock data for demo purposes
            lastModified: `${Math.floor(Math.random() * 30) + 1} days ago`,
            commitCount: Math.floor(Math.random() * 50) + 1,
            contributors: ["User1", "User2"].slice(0, Math.floor(Math.random() * 2) + 1)
          };
          
          currentDir.children.push(fileNode);
        }
      });
    });
    
    return root;
  };
  
  // Convert the tree to D3 graph format
  const convertToD3Graph = (root: TreeNode | null): { nodes: D3Node[], links: D3Link[] } => {
    if (!root) return { nodes: [], links: [] };
    
    const nodes: D3Node[] = [];
    const links: D3Link[] = [];
    
    // Helper function to recursively add nodes and links
    const processNode = (node: TreeNode, parent: TreeNode | null = null) => {
      // Add node
      const d3Node: D3Node = {
        id: node.id,
        name: node.name,
        path: node.path,
        type: node.type,
        extension: node.extension,
        radius: node.type === 'directory' ? 18 : 14,
        color: node.type === 'directory' 
          ? 'rgba(139, 92, 246, 0.8)' 
          : (node.color || FILE_EXTENSIONS_COLORS.default)
      };
      
      nodes.push(d3Node);
      
      // Add link to parent
      if (parent) {
        links.push({
          source: parent.id,
          target: node.id,
          value: 1
        });
      }
      
      // Process children
      node.children.forEach(child => {
        processNode(child, node);
      });
    };
    
    processNode(root);
    
    return { nodes, links };
  };
  
  // Handle file download
  const handleDownload = () => {
    const downloadUrl = getRepoDownloadUrl(repoUrl);
    
    if (downloadUrl) {
      window.open(downloadUrl, '_blank');
      toast.success("Download started!");
    } else {
      toast.error("Could not generate download link");
    }
  };
  
  // Handle share
  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Share link copied to clipboard!");
  };
  
  // Handle zoom controls
  const handleZoomIn = () => {
    if (svgRef.current && zoomLevel < 3) {
      const svg = d3.select(svgRef.current);
      svg.transition().duration(300)
        .call(d3.zoom().scaleBy, 1.2);
    }
  };
  
  // Add drag event handlers
  const dragstarted = (event: d3.D3DragEvent<SVGGElement, D3Node, D3Node>, d: D3Node) => {
    if (!event.active && simulation) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
  };

  const dragged = (event: d3.D3DragEvent<SVGGElement, D3Node, D3Node>, d: D3Node) => {
    d.fx = event.x;
    d.fy = event.y;
  };

  const dragended = (event: d3.D3DragEvent<SVGGElement, D3Node, D3Node>, d: D3Node) => {
    if (!event.active && simulation) simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
  };

  const handleZoomOut = () => {
    if (svgRef.current && zoomLevel > 0.2) {
      const svg = d3.select(svgRef.current);
      svg.transition().duration(300)
        .call(d3.zoom().scaleBy, 1 / 1.2);
    }
  };
  
  const handleResetView = () => {
    if (svgRef.current && graphContainerRef.current) {
      const width = graphContainerRef.current.clientWidth;
      const height = graphContainerRef.current.clientHeight || 600;
      const svg = d3.select(svgRef.current);
      const transform = d3.zoomIdentity.translate(width / 2, height / 2).scale(1);
      svg.transition().duration(500)
        .call(d3.zoom().transform, transform);
    }
  };
  
  // Helper function to get file icon
  const getFileIcon = (extension: string): string => {
    const iconMap: Record<string, string> = {
      js: "🟨",
      jsx: "⚛️",
      ts: "🔷",
      tsx: "🔷",
      css: "🎨",
      scss: "🎨",
      html: "📄",
      json: "📋",
      md: "📝",
      py: "🐍",
      rb: "💎",
      go: "🔹",
      java: "☕",
      php: "🐘",
      default: "📄"
    };
    
    return iconMap[extension] || iconMap.default;
  };
  
  // Mock function to fetch file content with progress
  const fetchFileContent = async (path: string) => {
    setFileContentLoading(true);
    
    // Simulate progress for file content loading
    let progress = 0;
    const progressInterval = setInterval(() => {
      progress += 20;
      if (progress >= 100) {
        clearInterval(progressInterval);
        // Add a small delay before completing
        setTimeout(() => {
          const mockContent = `// File: ${path}
import React from 'react';

/**
 * This is a sample file content
 * In a real implementation, we would fetch this from GitHub API
 */
function ExampleComponent() {
  return (
    <div className="example">
      <h1>Hello from ${path}</h1>
      <p>This is a sample content</p>
    </div>
  );
}

export default ExampleComponent;`;
          
          setFileContent(mockContent);
          setFileContentLoading(false);
        }, 200);
      }
    }, 200);
  };
  
  // When a node is selected, fetch its content
  useEffect(() => {
    if (selectedNode && selectedNode.type === 'file' && isDetailSheetOpen) {
      fetchFileContent(selectedNode.path);
    }
  }, [selectedNode, isDetailSheetOpen]);
  
  // Tree View implementation
  const renderTreeNode = (node: TreeNode, depth = 0) => {
    const isDirectory = node.type === 'directory';
    const isExpanded = !node.collapsed;
    const hasChildren = node.children.length > 0;
    
    // Check if the node matches the search term
    const matchesSearch = searchTerm 
      ? node.name.toLowerCase().includes(searchTerm.toLowerCase())
      : true;
    
    // Check if the node matches the filter
    const matchesFilter = filterType
      ? (filterType === 'directory' ? node.type === 'directory' : node.extension === filterType)
      : true;
    
    // Skip rendering if the node doesn't match search or filter
    // But keep directories that might contain matching children
    if (!matchesSearch && !matchesFilter && (!isDirectory || !hasChildren)) {
      return null;
    }
    
    // If it's a directory, check if any children match
    if (isDirectory && hasChildren && !matchesSearch && !matchesFilter) {
      // Check if any children match
      const anyChildMatches = node.children.some(child => {
        if (searchTerm && !child.name.toLowerCase().includes(searchTerm.toLowerCase())) {
          return false;
        }
        if (filterType) {
          if (filterType === 'directory') {
            return child.type === 'directory';
          } else {
            return child.extension === filterType;
          }
        }
        return true;
      });
      
      if (!anyChildMatches) {
        return null;
      }
    }
    
    return (
      <div key={node.id} className="tree-node">
        <Collapsible
          open={isDirectory ? isExpanded : undefined}
          onOpenChange={isDirectory && hasChildren ? (isOpen) => {
            // Toggle the node's collapsed state
            const toggleNode = (n: TreeNode): TreeNode => {
              if (n.id === node.id) {
                return { ...n, collapsed: !isOpen };
              }
              
              return {
                ...n,
                children: n.children.map(toggleNode)
              };
            };
            
            if (rootNode) {
              setRootNode(toggleNode(rootNode));
            }
          } : undefined}
          disabled={!isDirectory || !hasChildren}
        >
          <div 
            className={`flex items-center py-1 px-2 rounded-md cursor-pointer border hover:bg-muted/50 ${
              selectedNode?.id === node.id ? 'bg-muted/70' : ''
            }`}
            style={{ marginLeft: `${depth * 16}px` }}
            onClick={() => {
              setSelectedNode(node);
              if (!isDirectory) {
                setIsDetailSheetOpen(true);
              }
            }}
          >
            <CollapsibleTrigger 
              className={`mr-1 ${!isDirectory || !hasChildren ? 'invisible' : ''}`}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </CollapsibleTrigger>
            
            <div className="flex items-center flex-1 gap-2">
              {isDirectory ? (
                <FolderIcon className="h-4 w-4 text-purple-400" />
              ) : (
                <FileIcon 
                  className="h-4 w-4" 
                  style={{ color: FILE_EXTENSIONS_COLORS[node.extension as keyof typeof FILE_EXTENSIONS_COLORS] || FILE_EXTENSIONS_COLORS.default }}
                />
              )}
              <span className={`text-sm ${selectedNode?.id === node.id ? 'font-medium' : ''}`}>{node.name}</span>
              
              {node.extension && (
                <Badge variant="outline" className="text-[0.65rem] bg-muted/40 h-4">
                  {node.extension}
                </Badge>
              )}
            </div>
          </div>
          
          <CollapsibleContent>
            {isDirectory && node.children
              .sort((a, b) => {
                // Sort directories first, then files
                if (a.type === b.type) {
                  return a.name.localeCompare(b.name);
                }
                return a.type === 'directory' ? -1 : 1;
              })
              .map(child => renderTreeNode(child, depth + 1))}
          </CollapsibleContent>
        </Collapsible>
      </div>
    );
  };
  
  // Get unique file extensions for filtering
  const fileExtensions = useMemo(() => {
    const extensions = new Set<string>();
    
    const processNode = (node: TreeNode) => {
      if (node.type === 'file' && node.extension) {
        extensions.add(node.extension);
      }
      
      node.children.forEach(processNode);
    };
    
    if (rootNode) {
      processNode(rootNode);
    }
    
    return Array.from(extensions).sort();
  }, [rootNode]);
  
  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col space-y-8 h-full">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">Repository Visualization</h2>
          <div className="flex space-x-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-24" />
          </div>
        </div>
        
        <div className="flex flex-col space-y-4 flex-grow bg-muted/10 rounded-lg border border-border/30 p-6">
          <div className="flex justify-between">
            <Skeleton className="h-10 w-64" />
            <div className="flex space-x-2">
              <Skeleton className="h-10 w-10 rounded-full" />
              <Skeleton className="h-10 w-10 rounded-full" />
              <Skeleton className="h-10 w-10 rounded-full" />
            </div>
          </div>
          
          <div className="flex-grow flex items-center justify-center">
            <div className="flex flex-col items-center text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mb-4"></div>
              <p className="text-lg font-medium text-muted-foreground">Loading repository structure...</p>
              <p className="text-sm text-muted-foreground/80 mt-2">
                Analyzing files and building visualization...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-16">
        <div className="text-destructive text-4xl mb-4">⚠️</div>
        <h3 className="text-xl font-semibold mb-2 text-destructive">Error Loading Repository</h3>
        <p className="text-muted-foreground text-center max-w-md">{error}</p>
        <p className="text-muted-foreground/70 text-center max-w-md mt-4">
          Please check that the repository exists and is public, or add a GitHub API key in settings.
        </p>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col space-y-4 h-full">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold bg-gradient-to-r from-indigo-400 to-purple-400 text-transparent bg-clip-text">
          Repository Visualization
        </h2>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleDownload}
            className="flex items-center bg-muted/10 backdrop-blur-sm border-border/40"
          >
            <Download size={16} className="mr-2" />
            Download
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleShare}
            className="flex items-center bg-muted/10 backdrop-blur-sm border-border/40"
          >
            <Share size={16} className="mr-2" />
            Share
          </Button>
        </div>
      </div>
      
      <Tabs defaultValue="visualization" className="w-full">
        <div className="flex justify-between items-center mb-4">
          <TabsList className="bg-muted/20 backdrop-blur-sm border border-border/20 p-1">
            <TabsTrigger 
              value="visualization"
              className="data-[state=active]:bg-background/60 data-[state=active]:backdrop-blur-md"
            >
              Visualization
            </TabsTrigger>
            <TabsTrigger 
              value="explorer"
              className="data-[state=active]:bg-background/60 data-[state=active]:backdrop-blur-md"
            >
              Explorer
            </TabsTrigger>
          </TabsList>
          
          <div className="flex items-center space-x-2">
            <Input
              placeholder="Search files..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-9 w-64 bg-muted/10 backdrop-blur-sm border-border/40"
            />
            <Select
              value={filterType || "all"}
              onValueChange={(value) => setFilterType(value === "all" ? null : value)}
            >
              <SelectTrigger className="w-[180px] h-9 bg-muted/10 backdrop-blur-sm border-border/40">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="directory">Directories</SelectItem>
                {fileExtensions.map(ext => (
                  <SelectItem key={ext} value={ext}>
                    {ext.toUpperCase()} files
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <TabsContent value="visualization" className="mt-0">
          <div className="relative flex flex-col h-[70vh] bg-muted/5 backdrop-blur-sm rounded-lg border border-white/70 overflow-hidden">
            <div className="absolute top-4 right-4 flex gap-2 z-10">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      onClick={handleZoomIn}
                      className="h-8 w-8 bg-background/60 backdrop-blur-md border-border/40"
                    >
                      <ZoomIn size={16} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Zoom In</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      onClick={handleZoomOut}
                      className="h-8 w-8 bg-background/60 backdrop-blur-md border-border/40"
                    >
                      <ZoomOut size={16} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Zoom Out</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      onClick={handleResetView}
                      className="h-8 w-8 bg-background/60 backdrop-blur-md border-border/40"
                    >
                      <Maximize size={16} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Reset View</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            
            <div className="flex-grow" ref={graphContainerRef}>
              <svg ref={svgRef} className="w-full h-full" />
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="explorer" className="mt-0">
          <div className="h-[70vh] bg-muted/5 backdrop-blur-sm rounded-lg border border-border/20 p-4">
            {rootNode && (
              <ScrollArea className="h-full pr-4">
                {rootNode.children
                  .sort((a, b) => {
                    // Sort directories first, then files
                    if (a.type === b.type) {
                      return a.name.localeCompare(b.name);
                    }
                    return a.type === 'directory' ? -1 : 1;
                  })
                  .map(node => renderTreeNode(node))}
              </ScrollArea>
            )}
          </div>
        </TabsContent>
      </Tabs>
      
      <Sheet open={isDetailSheetOpen} onOpenChange={setIsDetailSheetOpen}>
        <SheetContent className="sm:max-w-lg">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              {selectedNode?.type === 'directory' ? (
                <FolderIcon className="h-5 w-5 text-purple-400" />
              ) : (
                <FileIcon 
                  className="h-5 w-5" 
                  style={{ 
                    color: selectedNode?.color || FILE_EXTENSIONS_COLORS.default 
                  }}
                />
              )}
              {selectedNode?.name || 'File Details'}
              {selectedNode?.extension && (
                <Badge variant="outline" className="ml-2 text-xs">
                  {selectedNode.extension}
                </Badge>
              )}
            </SheetTitle>
            <SheetDescription>
              <div className="flex items-center gap-2 text-muted-foreground mt-1">
                <span className="flex items-center gap-1 text-xs">
                  <Clock className="h-3 w-3" /> 
                  Last modified: {selectedNode?.lastModified || 'Unknown'}
                </span>
                {selectedNode?.commitCount && (
                  <span className="flex items-center gap-1 text-xs">
                    <GitCommit className="h-3 w-3" /> 
                    {selectedNode.commitCount} commits
                  </span>
                )}
              </div>
            </SheetDescription>
          </SheetHeader>
          
          <div className="mt-6">
            {selectedNode?.type === 'file' ? (
              <div className="space-y-4">
                <div className="flex justify-between">
                  <div className="flex items-center gap-2">
                    <FileCode className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">File Content</span>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-7 px-3"
                    onClick={() => {
                      window.open(`${repoUrl}/blob/main/${selectedNode.path}`, '_blank');
                    }}
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    View on GitHub
                  </Button>
                </div>
                
                {fileContentLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-4 w-5/6" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                ) : (
                  <div className="relative">
                    <pre className="p-4 rounded-md bg-muted/30 text-xs font-mono overflow-x-auto">
                      <code>{fileContent}</code>
                    </pre>
                  </div>
                )}
                
                <div className="pt-4 border-t border-border/30">
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    Contributors
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedNode.contributors?.map((contributor, i) => (
                      <Badge key={i} variant="outline" className="flex items-center gap-1 py-1">
                        {contributor}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Folder className="h-4 w-4 text-purple-400" />
                  Directory Content
                </h4>
                
                {selectedNode?.children && (
                  <div className="space-y-1">
                    {selectedNode.children
                      .sort((a, b) => {
                        // Sort directories first, then files
                        if (a.type === b.type) {
                          return a.name.localeCompare(b.name);
                        }
                        return a.type === 'directory' ? -1 : 1;
                      })
                      .map(child => (
                        <div 
                          key={child.id}
                          className="flex items-center py-1 px-2 rounded-md hover:bg-muted/20 cursor-pointer"
                          onClick={() => setSelectedNode(child)}
                        >
                          {child.type === 'directory' ? (
                            <FolderIcon className="h-4 w-4 text-purple-400 mr-2" />
                          ) : (
                            <FileIcon 
                              className="h-4 w-4 mr-2" 
                              style={{ 
                                color: FILE_EXTENSIONS_COLORS[child.extension as keyof typeof FILE_EXTENSIONS_COLORS] || FILE_EXTENSIONS_COLORS.default 
                              }}
                            />
                          )}
                          <span className="text-sm">{child.name}</span>
                          
                          {child.extension && (
                            <Badge variant="outline" className="ml-2 text-[0.65rem] h-4">
                              {child.extension}
                            </Badge>
                          )}
                        </div>
                      ))
                    }
                  </div>
                )}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default RepositoryVisualizer;
