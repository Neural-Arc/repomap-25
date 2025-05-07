import React, { useEffect, useRef, useState, useCallback, useMemo, useLayoutEffect } from "react";
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
import { RepoNode, getRepoDownloadUrl, convertRepoDataToNodes, getFileContent } from "@/services/githubService";
import debounce from 'lodash/debounce';

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
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  
  // Track simulation for cleanup
  const simulationRef = useRef<d3.Simulation<D3Node, d3.SimulationLinkDatum<D3Node>> | null>(null);

  // Add state for visibility
  const [isVisible, setIsVisible] = useState(true);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const initializationAttempted = useRef(false);

  // Add zoom ref
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  // Memoize the processed data with lazy loading
  const processedData = useMemo(() => {
    if (!repoData) return { nodes: [], links: [] };
    const rootNode = convertRepoDataToNodes(repoData);
    return convertToD3Format(rootNode);
  }, [repoData]);

  // Optimize simulation configuration
  const simulationConfig = useMemo(() => ({
    charge: -150, // Reduced charge for better performance
    linkDistance: 50, // Reduced distance for better performance
    linkStrength: 0.15, // Reduced strength for better performance
    collisionRadius: 1.2, // Reduced collision radius
    centerStrength: 0.03, // Reduced center strength
    alphaDecay: 0.08, // Faster stabilization
    velocityDecay: 0.4 // Faster velocity decay
  }), []);

  // Debounced search handler
  const debouncedSearch = useCallback(
    debounce((value: string) => {
      setSearchTerm(value);
    }, 300),
    []
  );

  // Update the useEffect for visibility handling
  useLayoutEffect(() => {
    if (!containerRef.current) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        setIsVisible(entry.isIntersecting);
        
        // If becoming visible and we haven't initialized yet, trigger initialization
        if (entry.isIntersecting && !initializationAttempted.current) {
          initializationAttempted.current = true;
          processRepoData();
        }
      },
      { 
        threshold: 0.1,
        rootMargin: '50px' // Add margin to trigger slightly before fully visible
      }
    );

    observerRef.current.observe(containerRef.current);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  // Optimize node processing
  const processRepoData = useCallback(() => {
    if (!repoData) {
      setError("No repository data available");
      setLoading(false);
      return;
    }

    try {
      const { nodes, links } = processedData;
      
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
  }, [repoData, processedData]);

  // Update the useEffect for initialization
  useEffect(() => {
    if (loading) {
      processRepoData();
    } else if (nodes.length > 0 && !error && isVisible) {
      // Add a small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        initializeVisualization();
      }, 50);
      return () => clearTimeout(timer);
    }
    
    return () => {
      // Clean up simulation when component unmounts or visibility changes
      if (simulationRef.current) {
        simulationRef.current.stop();
      }
    };
  }, [loading, nodes, links, error, processRepoData, isVisible]);

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

  // Update the initializeVisualization function to handle visibility
  const initializeVisualization = useCallback(() => {
    if (!svgRef.current || !containerRef.current || nodes.length === 0 || !isVisible) return;
    
    // Clear previous visualization
    d3.select(svgRef.current).selectAll("*").remove();
    
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight || 700;
    const centerX = width / 2;
    const centerY = height / 2;
    
    // Create SVG with optimized rendering
    const svg = d3.select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", [0, 0, width, height])
      .attr("style", "will-change: transform; transform: translateZ(0)");
    
    // Create main container with hardware acceleration and initial centering
    const g = svg.append("g")
      .attr("style", "will-change: transform; transform: translateZ(0)")
      .attr("transform", `translate(${centerX},${centerY})`);
    
    // Optimize force simulation with better performance settings and centered positioning
    const simulation = d3.forceSimulation<D3Node>(nodes)
      .force("charge", d3.forceManyBody<D3Node>().strength(simulationConfig.charge))
      .force("link", d3.forceLink<D3Node, D3Link>(links)
        .id(d => d.id)
        .distance(simulationConfig.linkDistance)
        .strength(simulationConfig.linkStrength))
      .force("center", d3.forceCenter(0, 0)) // Center at origin since we translated the container
      .force("collision", d3.forceCollide<D3Node>().radius(d => d.size * simulationConfig.collisionRadius))
      .force("x", d3.forceX(0).strength(0.2)) // Center at origin
      .force("y", d3.forceY(0).strength(0.2)) // Center at origin
      .alphaDecay(simulationConfig.alphaDecay)
      .velocityDecay(simulationConfig.velocityDecay);
    
    // Store simulation for cleanup
    simulationRef.current = simulation;
    
    // Create links with optimized rendering
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
    
    // Create nodes with optimized rendering
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
      .on("click", handleNodeClick)
      .on("mouseover", (event, d) => {
        highlightConnections(d);
      })
      .on("mouseout", () => {
        resetHighlighting();
      });
    
    // Optimize node rendering with simplified visuals
    node.append("circle")
      .attr("r", d => d.size)
      .attr("fill", d => d.color)
      .attr("fill-opacity", 0.7)
      .attr("stroke", d => d.type === 'directory' ? '#a78bfa' : '#34d399')
      .attr("stroke-width", 1.5)
      .attr("stroke-opacity", 0.8);
    
    // Optimize text rendering with simplified labels
    node.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", ".35em")
      .attr("fill", "#fff")
      .attr("font-size", d => d.type === 'directory' ? "10px" : "8px")
      .text(d => d.type === 'directory' ? '📁' : getFileEmoji(d.extension || ''));
    
    // Optimize label rendering with simplified text
    node.append("text")
      .attr("dy", d => d.size + 15)
      .attr("text-anchor", "middle")
      .attr("fill", "#fff")
      .attr("font-size", "8px")
      .attr("font-weight", 500)
      .attr("pointer-events", "none")
      .text(d => {
        const name = d.name;
        return name.length > 12 ? name.substring(0, 9) + '...' : name;
      });
    
    // Optimize tick function with better performance
    simulation.on("tick", () => {
      link.attr("d", d => {
        const sourceX = (d.source as D3Node).x!;
        const sourceY = (d.source as D3Node).y!;
        const targetX = (d.target as D3Node).x!;
        const targetY = (d.target as D3Node).y!;
        
        const dx = targetX - sourceX;
        const dy = targetY - sourceY;
        const dr = Math.sqrt(dx * dx + dy * dy) * 2;
        
        // Use simpler path for better performance
        return dr < 80 
          ? `M${sourceX},${sourceY} L${targetX},${targetY}`
          : `M${sourceX},${sourceY} A${dr},${dr} 0 0,1 ${targetX},${targetY}`;
      });
      
      node.attr("transform", d => `translate(${d.x},${d.y})`);
    });
    
    // Update the initial positions of nodes to be centered
    nodes.forEach(node => {
      if (node.id === "root") {
        node.x = 0;
        node.y = 0;
        node.fx = 0;
        node.fy = 0;
      }
    });

    // Optimize zoom behavior with initial centering
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        g.attr("transform", `translate(${centerX},${centerY}) scale(${event.transform.k})`);
        setZoomLevel(event.transform.k);
      });

    // Store zoom behavior for later use
    zoomRef.current = zoom;

    // Apply zoom behavior to SVG with initial transform
    svg.call(zoom)
      .call(zoom.transform, d3.zoomIdentity.translate(centerX, centerY));

    // Cleanup function
    return () => {
      if (simulation) {
        simulation.stop();
      }
    };
  }, [nodes, links, simulationConfig, isVisible]);
  
  // Update the zoom handlers
  const handleZoomIn = useCallback(() => {
    if (!svgRef.current) return;
    
    const svg = d3.select(svgRef.current);
    const currentTransform = d3.zoomTransform(svg.node()!);
    const newScale = currentTransform.k * 1.3;
    
    svg.transition()
      .duration(300)
      .call(d3.zoom<SVGSVGElement, unknown>().transform, currentTransform.scale(newScale));
  }, []);

  const handleZoomOut = useCallback(() => {
    if (!svgRef.current) return;
    
    const svg = d3.select(svgRef.current);
    const currentTransform = d3.zoomTransform(svg.node()!);
    const newScale = currentTransform.k / 1.3;
    
    svg.transition()
      .duration(300)
      .call(d3.zoom<SVGSVGElement, unknown>().transform, currentTransform.scale(newScale));
  }, []);

  const handleResetView = useCallback(() => {
    if (!svgRef.current) return;
    
    const svg = d3.select(svgRef.current);
    svg.transition()
      .duration(300)
      .call(d3.zoom<SVGSVGElement, unknown>().transform, d3.zoomIdentity);
  }, []);
  
  // Filter nodes based on search and type filter
  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return;
    
    const svg = d3.select(svgRef.current);
    const nodeElements = svg.selectAll<SVGGElement, D3Node>(".node");
    
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
  
  // Handle window resize with debounce
  useEffect(() => {
    const handleResize = debounce(() => {
      if (isVisible) {
        initializeVisualization();
      }
    }, 250);

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      handleResize.cancel();
    };
  }, [nodes, links, isVisible]);
  
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
  
  // Helper functions for drag behavior
  function dragStarted(event: d3.D3DragEvent<SVGGElement, D3Node, D3Node>, d: D3Node) {
    if (!event.active) simulationRef.current?.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
  }
  
  function dragged(event: d3.D3DragEvent<SVGGElement, D3Node, D3Node>, d: D3Node) {
    d.fx = event.x;
    d.fy = event.y;
  }
  
  function dragEnded(event: d3.D3DragEvent<SVGGElement, D3Node, D3Node>, d: D3Node) {
    if (!event.active) simulationRef.current?.alphaTarget(0);
    d.fx = null;
    d.fy = null;
  }
  
  // Function to highlight connected nodes
  function highlightConnections(d: D3Node) {
    if (!svgRef.current) return;
    
    const svg = d3.select(svgRef.current);
    const nodeElements = svg.selectAll<SVGGElement, D3Node>(".node");
    const linkElements = svg.selectAll<SVGPathElement, D3Link>(".links path");
    
    const connected = new Set<string>([d.id]);
    
    // Find all connected nodes
    links.forEach(link => {
      const sourceId = typeof link.source === 'string' ? link.source : (link.source as D3Node).id;
      const targetId = typeof link.target === 'string' ? link.target : (link.target as D3Node).id;
      
      if (sourceId === d.id) connected.add(targetId);
      if (targetId === d.id) connected.add(sourceId);
    });
    
    // Apply visual highlighting
    nodeElements.classed("node--highlighted", n => connected.has(n.id));
    linkElements.classed("link--highlighted", l => {
      const sourceId = typeof l.source === 'string' ? l.source : (l.source as D3Node).id;
      const targetId = typeof l.target === 'string' ? l.target : (l.target as D3Node).id;
      return connected.has(sourceId) && connected.has(targetId);
    });
    
    // Fade non-connected nodes
    nodeElements.style("opacity", n => connected.has(n.id) ? 1 : 0.3);
    linkElements.style("opacity", l => {
      const sourceId = typeof l.source === 'string' ? l.source : (l.source as D3Node).id;
      const targetId = typeof l.target === 'string' ? l.target : (l.target as D3Node).id;
      return (connected.has(sourceId) && connected.has(targetId)) ? 0.8 : 0.1;
    });
    
    setHighlightedNodes(connected);
  }
  
  // Function to reset highlighting
  function resetHighlighting() {
    if (!svgRef.current) return;
    
    const svg = d3.select(svgRef.current);
    const nodeElements = svg.selectAll<SVGGElement, D3Node>(".node");
    const linkElements = svg.selectAll<SVGPathElement, D3Link>(".links path");
    
    nodeElements.classed("node--highlighted", false).style("opacity", 1);
    linkElements.classed("link--highlighted", false).style("opacity", 0.5);
    setHighlightedNodes(new Set());
  }

  // Add function to fetch file content
  const fetchFileContent = async (path: string) => {
    if (!path) return;
    
    setIsLoadingContent(true);
    setFileContent(null);
    
    try {
      const content = await getFileContent(repoUrl, path);
      setFileContent(content);
    } catch (error) {
      console.error("Error fetching file content:", error);
      toast.error("Failed to fetch file content");
    } finally {
      setIsLoadingContent(false);
    }
  };

  // Update node click handler
  const handleNodeClick = async (event: React.MouseEvent, d: D3Node) => {
    event.stopPropagation();
    setSelectedNode(d);
    setIsDetailSheetOpen(true);
    
    if (d.type === 'file' && d.path) {
      await fetchFileContent(d.path);
    }
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
            onChange={(e) => debouncedSearch(e.target.value)}
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
      
      <div className="relative flex flex-col h-[700px] bg-background rounded-lg border-2 border-indigo-500 overflow-hidden">
        <div className="absolute top-4 right-4 flex gap-2 z-10">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={handleZoomIn}
                  className="h-8 w-8 bg-background/60 backdrop-blur-md border-border/40 hover:bg-background/80"
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
                  className="h-8 w-8 bg-background/60 backdrop-blur-md border-border/40 hover:bg-background/80"
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
                  className="h-8 w-8 bg-background/60 backdrop-blur-md border-border/40 hover:bg-background/80"
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
                      <h4 className="text-sm font-medium">File Content</h4>
                      <div className="bg-muted/40 p-3 rounded-md overflow-auto max-h-[400px]">
                        {isLoadingContent ? (
                          <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                          </div>
                        ) : fileContent ? (
                          <pre className="text-xs font-mono whitespace-pre-wrap break-words">
                            {fileContent}
                          </pre>
                        ) : (
                          <div className="text-xs opacity-50 italic">
                            No content available
                          </div>
                        )}
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

export default React.memo(RadialMindMap);
