
import React, { useEffect, useRef, useState, useCallback } from "react";
import * as d3 from "d3";
import { toast } from "sonner";
import { 
  Download, Share, ZoomIn, ZoomOut, Maximize, Search, 
  Filter, X, Folder, FileCode, Info 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { RepoNode, getRepoDownloadUrl, convertRepoDataToNodes } from "@/services/githubService";

interface RadialMindMapProps {
  repoUrl: string;
  repoData: any;
}

interface D3Node extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  path?: string;
  type: 'directory' | 'file';
  extension?: string;
  color: string;
  size: number;
  depth: number;
  children?: D3Node[];
  parentId?: string;
}

interface D3Link {
  source: string | D3Node;
  target: string | D3Node;
  strength?: number;
  distance?: number;
}

// File extension colors with modern palette
const FILE_EXTENSIONS_COLORS: Record<string, string> = {
  js: "#f7df1e",    // JavaScript yellow
  jsx: "#61dafb",   // React blue
  ts: "#3178c6",    // TypeScript blue
  tsx: "#61dafb",   // React blue
  css: "#264de4",   // CSS blue
  scss: "#cc6699",  // SCSS pink
  html: "#e34f26",  // HTML orange
  json: "#5a9b44",  // JSON green
  md: "#9e70b2",    // Markdown purple
  py: "#3776ab",    // Python blue
  rb: "#cc342d",    // Ruby red
  go: "#00add8",    // Go blue
  java: "#007396",  // Java blue
  php: "#777bb4",   // PHP purple
  default: "#94a3b8" // Default slate
};

const RadialMindMap: React.FC<RadialMindMapProps> = ({ repoUrl, repoData }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [nodes, setNodes] = useState<D3Node[]>([]);
  const [links, setLinks] = useState<D3Link[]>([]);
  const [selectedNode, setSelectedNode] = useState<D3Node | null>(null);
  const [isDetailSheetOpen, setIsDetailSheetOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [filterType, setFilterType] = useState<string | null>(null);
  const [fileExtensions, setFileExtensions] = useState<string[]>([]);
  const [highlightedNodes, setHighlightedNodes] = useState<Set<string>>(new Set());
  
  // Track simulation for cleanup
  const simulationRef = useRef<d3.Simulation<D3Node, d3.SimulationLinkDatum<D3Node>> | null>(null);

  // Convert repo data to hierarchical structure for D3
  const processRepoData = useCallback(() => {
    if (!repoData) {
      setError("No repository data available");
      setLoading(false);
      return;
    }

    try {
      // First convert to the format expected by our visualization
      const rootNode: RepoNode = convertRepoDataToNodes(repoData);
      
      // Now convert to D3 compatible format
      const { nodes, links } = convertToD3Format(rootNode);
      
      // Extract unique file extensions for filtering
      const extensions = new Set<string>();
      nodes.forEach(node => {
        if (node.type === 'file' && node.extension) {
          extensions.add(node.extension);
        }
      });
      
      setFileExtensions(Array.from(extensions).sort());
      setNodes(nodes);
      setLinks(links);
      setLoading(false);
    } catch (error) {
      console.error("Error processing repository data:", error);
      setError("Failed to process repository data");
      setLoading(false);
    }
  }, [repoData]);

  // Initialize visualization once data is processed
  useEffect(() => {
    if (loading) {
      processRepoData();
    } else if (nodes.length > 0 && !error) {
      initializeVisualization();
    }
    
    return () => {
      // Clean up simulation when component unmounts
      if (simulationRef.current) {
        simulationRef.current.stop();
      }
    };
  }, [loading, nodes, links, error, processRepoData]);

  // Convert hierarchical repo structure to flat D3 nodes and links
  const convertToD3Format = (rootNode: RepoNode): { nodes: D3Node[], links: D3Link[] } => {
    const nodes: D3Node[] = [];
    const links: D3Link[] = [];
    
    // Process each node and its children recursively
    const processNode = (node: RepoNode, depth: number = 0, parent: string | null = null): void => {
      // Calculate node size based on type and depth
      const nodeSize = node.type === 'directory' ? 12 - (depth * 0.8) : 6 - (depth * 0.2);
      
      // Determine node color
      let nodeColor = node.type === 'directory' 
        ? '#8b5cf6' // Violet for directories
        : '#10b981'; // Emerald for files
      
      // For files, use extension-specific colors
      if (node.type === 'file' && node.path) {
        const extension = node.path.split('.').pop() || '';
        nodeColor = FILE_EXTENSIONS_COLORS[extension as keyof typeof FILE_EXTENSIONS_COLORS] || 
                    FILE_EXTENSIONS_COLORS.default;
      }
      
      // Create D3 node
      const d3Node: D3Node = {
        id: node.id,
        name: node.label,
        path: node.path,
        type: node.type as 'directory' | 'file',
        extension: node.path?.split('.').pop(),
        color: nodeColor,
        size: nodeSize,
        depth: depth
      };
      
      // Add to nodes array
      nodes.push(d3Node);
      
      // Create link to parent if not root
      if (parent) {
        links.push({
          source: parent,
          target: node.id,
          strength: 0.1,
          distance: 70 + (depth * 10) // Longer distance for deeper nodes
        });
      }
      
      // Process children
      if (node.children.length > 0) {
        node.children.forEach(child => {
          processNode(child, depth + 1, node.id);
        });
      }
    };
    
    // Start processing from root
    processNode(rootNode);
    
    return { nodes, links };
  };

  // Initialize D3 visualization
  const initializeVisualization = () => {
    if (!svgRef.current || !containerRef.current || nodes.length === 0) return;
    
    // Clear previous visualization
    d3.select(svgRef.current).selectAll("*").remove();
    
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight || 700;
    const centerX = width / 2;
    const centerY = height / 2;
    
    // Create SVG with gradient background
    const svg = d3.select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", [0, 0, width, height]);
    
    // Add a modern background gradient
    const defs = svg.append("defs");
    const gradient = defs.append("linearGradient")
      .attr("id", "background-gradient")
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "100%")
      .attr("y2", "100%");
    
    gradient.append("stop")
      .attr("offset", "0%")
      .attr("stop-color", "rgba(15, 23, 42, 0.9)"); // Dark slate blue
    
    gradient.append("stop")
      .attr("offset", "100%")
      .attr("stop-color", "rgba(3, 7, 18, 0.95)"); // Even darker blue
    
    // Apply background
    svg.append("rect")
      .attr("width", width)
      .attr("height", height)
      .attr("fill", "url(#background-gradient)");
    
    // Add subtle grid pattern
    const gridSize = 30;
    svg.append("g")
      .attr("class", "grid")
      .selectAll("line")
      .data(d3.range(0, width, gridSize))
      .enter()
      .append("line")
      .attr("x1", d => d)
      .attr("y1", 0)
      .attr("x2", d => d)
      .attr("y2", height)
      .attr("stroke", "rgba(148, 163, 184, 0.05)")
      .attr("stroke-width", 1);
    
    svg.select(".grid")
      .selectAll("line.horizontal")
      .data(d3.range(0, height, gridSize))
      .enter()
      .append("line")
      .attr("x1", 0)
      .attr("y1", d => d)
      .attr("x2", width)
      .attr("y2", d => d)
      .attr("stroke", "rgba(148, 163, 184, 0.05)")
      .attr("stroke-width", 1);
    
    // Create zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
        setZoomLevel(event.transform.k);
      });
    
    svg.call(zoom);
    
    // Main container for all elements with initial zoom
    const g = svg.append("g");
    
    // Create a force layout
    const simulation = d3.forceSimulation<D3Node>(nodes)
      .force("charge", d3.forceManyBody<D3Node>().strength(-200))
      .force("link", d3.forceLink<D3Node, D3Link>(links)
        .id(d => d.id)
        .distance(d => d.distance || 60)
        .strength(d => d.strength || 0.2))
      .force("center", d3.forceCenter(centerX, centerY))
      .force("collision", d3.forceCollide<D3Node>().radius(d => d.size * 1.5))
      .force("x", d3.forceX(centerX).strength(0.05))
      .force("y", d3.forceY(centerY).strength(0.05));
    
    // Store simulation for cleanup
    simulationRef.current = simulation;
    
    // Create links with curved paths for better visibility
    const link = g.append("g")
      .attr("class", "links")
      .selectAll("path")
      .data(links)
      .join("path")
      .attr("stroke", d => {
        const sourceNode = nodes.find(n => n.id === (typeof d.source === 'string' ? d.source : d.source.id));
        return sourceNode?.type === 'directory' ? 'rgba(139, 92, 246, 0.2)' : 'rgba(16, 185, 129, 0.2)';
      })
      .attr("stroke-width", 1.5)
      .attr("fill", "none")
      .attr("opacity", 0.5);
    
    // Create node groups with modern design
    const node = g.append("g")
      .attr("class", "nodes")
      .selectAll(".node")
      .data(nodes)
      .join("g")
      .attr("class", "node")
      .attr("cursor", "pointer")
      .attr("data-id", d => d.id)
      .attr("data-type", d => d.type)
      .attr("data-extension", d => d.extension || '')
      .call(d3.drag<SVGGElement, D3Node>()
        .on("start", dragStarted)
        .on("drag", dragged)
        .on("end", dragEnded) as any)
      .on("click", (event, d) => {
        event.stopPropagation(); // Prevent triggering zoom
        setSelectedNode(d);
        setIsDetailSheetOpen(true);
      })
      .on("mouseover", (event, d) => {
        highlightConnections(d);
      })
      .on("mouseout", () => {
        resetHighlighting();
      });
    
    // Add circular node backgrounds with glassmorphism effect
    node.append("circle")
      .attr("r", d => d.size)
      .attr("fill", d => d.color)
      .attr("fill-opacity", 0.7)
      .attr("stroke", d => d.type === 'directory' ? '#a78bfa' : '#34d399')
      .attr("stroke-width", 1.5)
      .attr("stroke-opacity", 0.8)
      .attr("filter", "drop-shadow(0 4px 6px rgba(0, 0, 0, 0.2))");
    
    // Add file/folder icons
    node.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", ".35em")
      .attr("fill", "#fff")
      .attr("font-size", d => d.type === 'directory' ? "10px" : "8px")
      .text(d => d.type === 'directory' ? '📁' : getFileEmoji(d.extension || ''));
    
    // Add text labels with a modern style
    node.append("text")
      .attr("dy", d => d.size + 15)
      .attr("text-anchor", "middle")
      .attr("fill", "#fff")
      .attr("font-size", "8px")
      .attr("font-weight", 500)
      .attr("pointer-events", "none")
      .attr("filter", "drop-shadow(0 2px 3px rgba(0, 0, 0, 0.7))")
      .text(d => {
        // Truncate long names
        const name = d.name;
        return name.length > 15 ? name.substring(0, 12) + '...' : name;
      });
    
    // Update positions on each tick with smoother curved links
    simulation.on("tick", () => {
      link.attr("d", d => {
        const sourceX = (d.source as D3Node).x!;
        const sourceY = (d.source as D3Node).y!;
        const targetX = (d.target as D3Node).x!;
        const targetY = (d.target as D3Node).y!;
        
        const dx = targetX - sourceX;
        const dy = targetY - sourceY;
        const dr = Math.sqrt(dx * dx + dy * dy) * 2;
        
        // Straight lines for closer nodes, curved for more distant
        if (dr < 100) {
          return `M${sourceX},${sourceY} L${targetX},${targetY}`;
        } else {
          return `M${sourceX},${sourceY} A${dr},${dr} 0 0,1 ${targetX},${targetY}`;
        }
      });
      
      node.attr("transform", d => `translate(${d.x},${d.y})`);
    });
    
    // Helper functions for drag behavior
    function dragStarted(event: d3.D3DragEvent<SVGGElement, D3Node, D3Node>, d: D3Node) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }
    
    function dragged(event: d3.D3DragEvent<SVGGElement, D3Node, D3Node>, d: D3Node) {
      d.fx = event.x;
      d.fy = event.y;
    }
    
    function dragEnded(event: d3.D3DragEvent<SVGGElement, D3Node, D3Node>, d: D3Node) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }
    
    // Function to highlight connected nodes
    function highlightConnections(d: D3Node) {
      const connected = new Set<string>([d.id]);
      
      // Find all connected nodes
      links.forEach(link => {
        const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
        const targetId = typeof link.target === 'string' ? link.target : link.target.id;
        
        if (sourceId === d.id) connected.add(targetId);
        if (targetId === d.id) connected.add(sourceId);
      });
      
      // Apply visual highlighting
      node.classed("node--highlighted", n => connected.has(n.id));
      link.classed("link--highlighted", l => {
        const sourceId = typeof l.source === 'string' ? l.source : l.source.id;
        const targetId = typeof l.target === 'string' ? l.target : l.target.id;
        return connected.has(sourceId) && connected.has(targetId);
      });
      
      // Fade non-connected nodes
      node.style("opacity", n => connected.has(n.id) ? 1 : 0.3);
      link.style("opacity", l => {
        const sourceId = typeof l.source === 'string' ? l.source : l.source.id;
        const targetId = typeof l.target === 'string' ? l.target : l.target.id;
        return (connected.has(sourceId) && connected.has(targetId)) ? 0.8 : 0.1;
      });
      
      setHighlightedNodes(connected);
    }
    
    // Function to reset highlighting
    function resetHighlighting() {
      node.classed("node--highlighted", false).style("opacity", 1);
      link.classed("link--highlighted", false).style("opacity", 0.5);
      setHighlightedNodes(new Set());
    }
    
    // Auto-fit the view with animation
    svg.transition()
      .duration(750)
      .call(zoom.transform, d3.zoomIdentity);
  };
  
  // Handle zoom controls
  const handleZoomIn = () => {
    if (svgRef.current) {
      const zoom = d3.zoom<SVGSVGElement, unknown>().scaleBy(d3.select(svgRef.current), 1.3);
      d3.select(svgRef.current).transition().duration(300).call(zoom as any);
    }
  };
  
  const handleZoomOut = () => {
    if (svgRef.current) {
      const zoom = d3.zoom<SVGSVGElement, unknown>().scaleBy(d3.select(svgRef.current), 1 / 1.3);
      d3.select(svgRef.current).transition().duration(300).call(zoom as any);
    }
  };
  
  const handleResetView = () => {
    if (svgRef.current && containerRef.current) {
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight || 700;
      
      const zoom = d3.zoom<SVGSVGElement, unknown>().transform(
        d3.select(svgRef.current),
        d3.zoomIdentity.translate(width / 2, height / 2).scale(1)
      );
      
      d3.select(svgRef.current).transition().duration(500).call(zoom as any);
    }
  };
  
  // Filter nodes based on search and type filter
  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return;
    
    const svg = d3.select(svgRef.current);
    const nodeElements = svg.selectAll(".node");
    
    // Apply search filter
    if (searchTerm) {
      nodeElements.style("opacity", d => {
        const node = d as D3Node;
        return node.name.toLowerCase().includes(searchTerm.toLowerCase()) ? 1 : 0.2;
      });
    } else {
      nodeElements.style("opacity", 1);
    }
    
    // Apply type filter
    if (filterType) {
      nodeElements.style("opacity", d => {
        const node = d as D3Node;
        if (filterType === 'directory') {
          return node.type === 'directory' ? 1 : 0.2;
        } else {
          return node.extension === filterType ? 1 : 0.2;
        }
      });
    }
    
    // Apply both filters if both are active
    if (searchTerm && filterType) {
      nodeElements.style("opacity", d => {
        const node = d as D3Node;
        const matchesSearch = node.name.toLowerCase().includes(searchTerm.toLowerCase());
        let matchesFilter = false;
        
        if (filterType === 'directory') {
          matchesFilter = node.type === 'directory';
        } else {
          matchesFilter = node.extension === filterType;
        }
        
        return matchesSearch && matchesFilter ? 1 : 0.2;
      });
    }
  }, [searchTerm, filterType, nodes]);
  
  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      initializeVisualization();
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [nodes, links]);
  
  // Handle download
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
  
  // Helper function to get emoji for file types
  const getFileEmoji = (extension: string): string => {
    const emojiMap: Record<string, string> = {
      js: "📝",
      jsx: "⚛️",
      ts: "🔷",
      tsx: "⚛️",
      css: "🎨",
      scss: "🎨",
      html: "🌐",
      json: "📋",
      md: "📄",
      py: "🐍",
      rb: "💎",
      java: "☕",
      go: "🔹",
      php: "🐘",
      txt: "📄"
    };
    
    return emojiMap[extension] || "📄";
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[600px]">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="mt-4 text-muted-foreground">Generating mind map visualization...</p>
          <div className="mt-8 space-y-4 w-96">
            <Skeleton className="h-8 w-full" />
            <div className="flex space-x-4">
              <Skeleton className="h-36 w-36 rounded-full" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-6 w-1/2" />
                <Skeleton className="h-6 w-5/6" />
              </div>
            </div>
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
    <div className="flex flex-col space-y-4 h-full">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold bg-gradient-to-r from-indigo-400 to-purple-400 text-transparent bg-clip-text">
          Repository Mind Map
        </h2>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleDownload}
            className="flex items-center bg-background/20 backdrop-blur-sm border-border/40"
          >
            <Download size={16} className="mr-2" />
            Download
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleShare}
            className="flex items-center bg-background/20 backdrop-blur-sm border-border/40"
          >
            <Share size={16} className="mr-2" />
            Share
          </Button>
        </div>
      </div>
      
      <div className="flex gap-4 items-center">
        <div className="flex-1">
          <Input
            placeholder="Search files and directories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-9 bg-background/20 backdrop-blur-sm border-border/40"
          />
        </div>
        <Select
          value={filterType || "all"}
          onValueChange={(value) => setFilterType(value === "all" ? null : value)}
        >
          <SelectTrigger className="w-[180px] h-9 bg-background/20 backdrop-blur-sm border-border/40">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="directory">Directories</SelectItem>
            {fileExtensions.map(ext => (
              <SelectItem key={ext} value={ext}>
                .{ext.toUpperCase()} files
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div className="relative flex flex-col h-[700px] bg-gradient-to-br from-slate-900/80 to-slate-950/90 backdrop-blur-sm rounded-lg border border-slate-800/30 overflow-hidden">
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
        
        <div className="flex-grow" ref={containerRef}>
          <svg ref={svgRef} className="w-full h-full" />
        </div>
      </div>
      
      <Card className="bg-background/10 backdrop-blur-md border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Mind Map Guide</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-muted-foreground">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-violet-500"></div>
                <span>Directories</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-emerald-500"></div>
                <span>Files</span>
              </div>
            </div>
            <div>
              <p>Click and drag nodes to reorganize</p>
              <p>Hover over nodes to see connections</p>
            </div>
            <div>
              <p>Click on nodes to see details</p>
              <p>Use search and filters to find specific files</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Details sheet that slides in from the side */}
      {selectedNode && (
        <Sheet open={isDetailSheetOpen} onOpenChange={setIsDetailSheetOpen}>
          <SheetContent side="right" className="w-full sm:max-w-lg p-0 overflow-hidden bg-gray-950/95 border-slate-800">
            <SheetHeader className="border-b border-slate-800 bg-gray-900/40 p-4">
              <SheetTitle className="flex items-center gap-2 text-white">
                {selectedNode.type === "directory" ? (
                  <Folder className="h-5 w-5 text-violet-400" />
                ) : (
                  <FileCode className="h-5 w-5 text-emerald-400" />
                )}
                {selectedNode.name}
              </SheetTitle>
              <SheetDescription className="text-gray-400">
                {selectedNode.path || "Path not available"}
              </SheetDescription>
            </SheetHeader>
            
            <ScrollArea className="h-full max-h-[calc(100vh-150px)]">
              <div className="p-6">
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground">Type</div>
                      <Badge variant={selectedNode.type === 'directory' ? 'secondary' : 'outline'}>
                        {selectedNode.type}
                      </Badge>
                    </div>
                    
                    {selectedNode.extension && (
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">Extension</div>
                        <Badge variant="outline" style={{ backgroundColor: FILE_EXTENSIONS_COLORS[selectedNode.extension as keyof typeof FILE_EXTENSIONS_COLORS] + '30' }}>
                          .{selectedNode.extension}
                        </Badge>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium flex items-center gap-1">
                      <Info className="h-3.5 w-3.5 text-muted-foreground" />
                      Connections
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      This {selectedNode.type} is connected to {
                        links.filter(link => {
                          const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
                          const targetId = typeof link.target === 'string' ? link.target : link.target.id;
                          return sourceId === selectedNode.id || targetId === selectedNode.id;
                        }).length
                      } other elements.
                    </p>
                  </div>
                  
                  {selectedNode.type === 'file' && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Preview</h4>
                      <div className="bg-muted/40 p-3 rounded-md overflow-auto max-h-48">
                        <div className="text-xs opacity-50 italic">
                          File preview not available in this view. Click on files in the repository explorer for content previews.
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Location in Repository</h4>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: selectedNode.color }}></div>
                      <span>Depth Level: {selectedNode.depth}</span>
                    </div>
                    {selectedNode.path && (
                      <div className="bg-muted/20 p-2 rounded text-xs font-mono overflow-x-auto">
                        {selectedNode.path}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </ScrollArea>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
};

export default RadialMindMap;
