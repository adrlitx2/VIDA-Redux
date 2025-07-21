/**
 * Grok 4.0 Development Code Analyzer
 * Internal development tool for code quality analysis and improvement using xAI's Grok model
 * This is a development-time tool, not for end users
 */

import OpenAI from "openai";
import fs from 'fs';
import path from 'path';

// Initialize Grok client using OpenAI-compatible API
const grok = new OpenAI({
  baseURL: "https://api.x.ai/v1",
  apiKey: process.env.XAI_API_KEY,
});

interface CodeAnalysis {
  score: number;
  issues: CodeIssue[];
  suggestions: CodeSuggestion[];
  performance: PerformanceInsight[];
  security: SecurityInsight[];
  maintainability: MaintainabilityScore;
  summary: string;
}

interface CodeIssue {
  type: 'error' | 'warning' | 'info';
  line: number;
  column: number;
  message: string;
  severity: 'high' | 'medium' | 'low';
  category: 'syntax' | 'logic' | 'performance' | 'security' | 'style';
}

interface CodeSuggestion {
  type: 'refactor' | 'optimize' | 'modernize' | 'simplify';
  description: string;
  before: string;
  after: string;
  impact: 'high' | 'medium' | 'low';
  effort: 'low' | 'medium' | 'high';
}

interface PerformanceInsight {
  metric: string;
  current: string;
  optimized: string;
  improvement: string;
  technique: string;
}

interface SecurityInsight {
  vulnerability: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  fix: string;
  cwe?: string;
}

interface MaintainabilityScore {
  overall: number;
  complexity: number;
  readability: number;
  testability: number;
  modularity: number;
}

export class GrokCodeAnalyzer {
  
  /**
   * Analyze a single code file using Grok 4.0
   */
  async analyzeFile(filePath: string): Promise<CodeAnalysis> {
    try {
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const fileExtension = path.extname(filePath);
      const language = this.detectLanguage(fileExtension);
      
      const analysis = await this.performGrokAnalysis(fileContent, language, filePath);
      
      return analysis;
    } catch (error) {
      console.error(`Error analyzing file ${filePath}:`, error);
      throw new Error(`Failed to analyze file: ${error.message}`);
    }
  }
  
  /**
   * Analyze multiple files or entire directory
   */
  async analyzeCodebase(targetPath: string): Promise<{
    overall: CodeAnalysis;
    files: Map<string, CodeAnalysis>;
    recommendations: string[];
  }> {
    const files = this.getAllCodeFiles(targetPath);
    const fileAnalyses = new Map<string, CodeAnalysis>();
    
    // Analyze files in parallel for better performance
    const analysisPromises = files.map(async (file) => {
      const analysis = await this.analyzeFile(file);
      fileAnalyses.set(file, analysis);
      return analysis;
    });
    
    await Promise.all(analysisPromises);
    
    // Generate overall codebase analysis
    const overall = await this.generateCodebaseOverview(fileAnalyses);
    const recommendations = await this.generateRecommendations(fileAnalyses);
    
    return {
      overall,
      files: fileAnalyses,
      recommendations
    };
  }
  
  /**
   * Generate code improvements using Grok 4.0
   */
  async generateImprovements(code: string, language: string): Promise<{
    improved: string;
    explanation: string;
    changes: string[];
  }> {
    const prompt = `As a senior software engineer, analyze this ${language} code and provide an improved version:

\`\`\`${language}
${code}
\`\`\`

Please provide:
1. Improved code with better performance, readability, and maintainability
2. Detailed explanation of changes made
3. List of specific improvements applied

Focus on:
- Performance optimizations
- Code clarity and readability
- Error handling improvements
- Security enhancements
- Modern language features
- Best practices adherence

Respond in JSON format:
{
  "improved": "improved code here",
  "explanation": "detailed explanation of changes",
  "changes": ["list of specific improvements"]
}`;

    const response = await grok.chat.completions.create({
      model: "grok-2-1212",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    return JSON.parse(response.choices[0].message.content || '{}');
  }
  
  /**
   * Generate comprehensive code documentation
   */
  async generateDocumentation(code: string, language: string): Promise<{
    documentation: string;
    apiDocs: string;
    examples: string[];
  }> {
    const prompt = `Generate comprehensive documentation for this ${language} code:

\`\`\`${language}
${code}
\`\`\`

Please provide:
1. Complete documentation with JSDoc/TSDoc comments
2. API documentation for public methods
3. Usage examples

Format as JSON:
{
  "documentation": "code with added documentation comments",
  "apiDocs": "API documentation markdown",
  "examples": ["usage example 1", "usage example 2"]
}`;

    const response = await grok.chat.completions.create({
      model: "grok-2-1212",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.2,
    });

    return JSON.parse(response.choices[0].message.content || '{}');
  }
  
  /**
   * Advanced refactoring suggestions
   */
  async suggestRefactoring(code: string, language: string): Promise<{
    refactorings: Array<{
      type: string;
      description: string;
      before: string;
      after: string;
      benefits: string[];
    }>;
  }> {
    const prompt = `Analyze this ${language} code and suggest advanced refactoring opportunities:

\`\`\`${language}
${code}
\`\`\`

Focus on:
- Design patterns that could be applied
- Code duplication elimination
- Function/class extraction opportunities
- Performance optimizations
- Error handling improvements
- Type safety enhancements

Format as JSON:
{
  "refactorings": [
    {
      "type": "refactoring type",
      "description": "what to refactor",
      "before": "original code snippet",
      "after": "refactored code snippet",
      "benefits": ["benefit 1", "benefit 2"]
    }
  ]
}`;

    const response = await grok.chat.completions.create({
      model: "grok-2-1212",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.4,
    });

    return JSON.parse(response.choices[0].message.content || '{}');
  }
  
  /**
   * Core Grok analysis implementation
   */
  private async performGrokAnalysis(code: string, language: string, filePath: string): Promise<CodeAnalysis> {
    const prompt = `Perform comprehensive code analysis on this ${language} file (${filePath}):

\`\`\`${language}
${code}
\`\`\`

Analyze for:
1. Code quality issues (syntax, logic, performance, security, style)
2. Improvement suggestions with before/after examples
3. Performance optimization opportunities
4. Security vulnerabilities
5. Maintainability metrics

Provide detailed analysis in JSON format:
{
  "score": 85,
  "issues": [
    {
      "type": "warning",
      "line": 15,
      "column": 5,
      "message": "Potential null pointer dereference",
      "severity": "medium",
      "category": "logic"
    }
  ],
  "suggestions": [
    {
      "type": "optimize",
      "description": "Use async/await instead of promises",
      "before": "promise code",
      "after": "async/await code",
      "impact": "medium",
      "effort": "low"
    }
  ],
  "performance": [
    {
      "metric": "Memory Usage",
      "current": "High",
      "optimized": "Medium",
      "improvement": "30% reduction",
      "technique": "Object pooling"
    }
  ],
  "security": [
    {
      "vulnerability": "SQL Injection",
      "severity": "high",
      "description": "User input not sanitized",
      "fix": "Use parameterized queries",
      "cwe": "CWE-89"
    }
  ],
  "maintainability": {
    "overall": 78,
    "complexity": 65,
    "readability": 85,
    "testability": 70,
    "modularity": 80
  },
  "summary": "Overall code quality assessment"
}`;

    const response = await grok.chat.completions.create({
      model: "grok-2-1212",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.1,
    });

    return JSON.parse(response.choices[0].message.content || '{}');
  }
  
  /**
   * Detect programming language from file extension
   */
  private detectLanguage(extension: string): string {
    const languageMap: { [key: string]: string } = {
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.py': 'python',
      '.java': 'java',
      '.cpp': 'cpp',
      '.c': 'c',
      '.cs': 'csharp',
      '.go': 'go',
      '.rs': 'rust',
      '.php': 'php',
      '.rb': 'ruby',
      '.swift': 'swift',
      '.kt': 'kotlin',
      '.scala': 'scala',
      '.sql': 'sql',
      '.css': 'css',
      '.html': 'html',
      '.md': 'markdown',
      '.json': 'json',
      '.yaml': 'yaml',
      '.yml': 'yaml',
    };
    
    return languageMap[extension] || 'text';
  }
  
  /**
   * Get all code files from directory
   */
  private getAllCodeFiles(targetPath: string): string[] {
    const codeExtensions = ['.ts', '.tsx', '.js', '.jsx', '.py', '.java', '.cpp', '.c', '.cs', '.go', '.rs', '.php', '.rb', '.swift', '.kt', '.scala'];
    const files: string[] = [];
    
    const traverse = (dir: string) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
          traverse(fullPath);
        } else if (entry.isFile() && codeExtensions.includes(path.extname(entry.name))) {
          files.push(fullPath);
        }
      }
    };
    
    if (fs.statSync(targetPath).isDirectory()) {
      traverse(targetPath);
    } else {
      files.push(targetPath);
    }
    
    return files;
  }
  
  /**
   * Generate codebase overview
   */
  private async generateCodebaseOverview(fileAnalyses: Map<string, CodeAnalysis>): Promise<CodeAnalysis> {
    const allIssues: CodeIssue[] = [];
    const allSuggestions: CodeSuggestion[] = [];
    const allPerformance: PerformanceInsight[] = [];
    const allSecurity: SecurityInsight[] = [];
    
    let totalScore = 0;
    let complexitySum = 0;
    let readabilitySum = 0;
    let testabilitySum = 0;
    let modularitySum = 0;
    
    fileAnalyses.forEach((analysis) => {
      allIssues.push(...analysis.issues);
      allSuggestions.push(...analysis.suggestions);
      allPerformance.push(...analysis.performance);
      allSecurity.push(...analysis.security);
      
      totalScore += analysis.score;
      complexitySum += analysis.maintainability.complexity;
      readabilitySum += analysis.maintainability.readability;
      testabilitySum += analysis.maintainability.testability;
      modularitySum += analysis.maintainability.modularity;
    });
    
    const fileCount = fileAnalyses.size;
    
    return {
      score: Math.round(totalScore / fileCount),
      issues: allIssues,
      suggestions: allSuggestions,
      performance: allPerformance,
      security: allSecurity,
      maintainability: {
        overall: Math.round(totalScore / fileCount),
        complexity: Math.round(complexitySum / fileCount),
        readability: Math.round(readabilitySum / fileCount),
        testability: Math.round(testabilitySum / fileCount),
        modularity: Math.round(modularitySum / fileCount)
      },
      summary: `Analyzed ${fileCount} files with ${allIssues.length} issues found and ${allSuggestions.length} improvement suggestions generated.`
    };
  }
  
  /**
   * Generate high-level recommendations
   */
  private async generateRecommendations(fileAnalyses: Map<string, CodeAnalysis>): Promise<string[]> {
    const criticalIssues = Array.from(fileAnalyses.values())
      .flatMap(analysis => analysis.issues)
      .filter(issue => issue.severity === 'high');
    
    const securityIssues = Array.from(fileAnalyses.values())
      .flatMap(analysis => analysis.security)
      .filter(issue => issue.severity === 'critical' || issue.severity === 'high');
    
    const recommendations: string[] = [];
    
    if (criticalIssues.length > 0) {
      recommendations.push(`Address ${criticalIssues.length} high-priority code issues immediately`);
    }
    
    if (securityIssues.length > 0) {
      recommendations.push(`Fix ${securityIssues.length} security vulnerabilities as priority`);
    }
    
    const avgMaintainability = Array.from(fileAnalyses.values())
      .reduce((sum, analysis) => sum + analysis.maintainability.overall, 0) / fileAnalyses.size;
    
    if (avgMaintainability < 70) {
      recommendations.push("Focus on improving code maintainability through refactoring");
    }
    
    recommendations.push("Consider implementing automated testing for better code quality");
    recommendations.push("Set up continuous integration with code quality checks");
    
    return recommendations;
  }
}

export const grokAnalyzer = new GrokCodeAnalyzer();