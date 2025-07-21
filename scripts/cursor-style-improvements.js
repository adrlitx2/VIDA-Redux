#!/usr/bin/env node

/**
 * Cursor-Style Intelligent Code Improvements
 * Real-time development assistance using Grok 4.0
 */

import { grokAnalyzer } from '../server/services/grok-code-analyzer.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class CursorStyleAssistant {
  constructor() {
    this.watchedFiles = new Set();
    this.improvementQueue = [];
    this.lastAnalysis = new Map();
  }

  /**
   * Analyze specific function or code block
   */
  async analyzeSelection(filePath, startLine, endLine) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const selection = lines.slice(startLine - 1, endLine).join('\n');
    
    const language = this.getLanguageFromFile(filePath);
    
    console.log(`🔍 Analyzing selection in ${filePath} (lines ${startLine}-${endLine})`);
    
    const improvements = await grokAnalyzer.generateImprovements(selection, language);
    const refactorings = await grokAnalyzer.suggestRefactoring(selection, language);
    
    return {
      original: selection,
      improvements,
      refactorings,
      location: { file: filePath, startLine, endLine }
    };
  }

  /**
   * Get context-aware suggestions for current cursor position
   */
  async getContextSuggestions(filePath, line, column) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    // Get surrounding context (5 lines before and after)
    const contextStart = Math.max(0, line - 5);
    const contextEnd = Math.min(lines.length, line + 5);
    const context = lines.slice(contextStart, contextEnd).join('\n');
    
    const language = this.getLanguageFromFile(filePath);
    
    const prompt = `Analyze this ${language} code context and provide intelligent suggestions for the cursor position at line ${line}, column ${column}:

\`\`\`${language}
${context}
\`\`\`

Provide:
1. Auto-completion suggestions
2. Quick fixes for any issues
3. Code optimization recommendations
4. Type safety improvements

Format as JSON:
{
  "completions": ["suggestion1", "suggestion2"],
  "quickFixes": [{"description": "fix description", "code": "fixed code"}],
  "optimizations": [{"type": "optimization type", "suggestion": "suggestion"}],
  "typeImprovements": [{"issue": "type issue", "fix": "type fix"}]
}`;

    const response = await this.queryGrok(prompt);
    return response;
  }

  /**
   * Intelligent error diagnosis and fixes
   */
  async diagnoseError(filePath, errorMessage, line) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    // Get context around error line
    const contextStart = Math.max(0, line - 10);
    const contextEnd = Math.min(lines.length, line + 10);
    const context = lines.slice(contextStart, contextEnd).join('\n');
    
    const language = this.getLanguageFromFile(filePath);
    
    const prompt = `Diagnose and fix this ${language} error:

Error: ${errorMessage}
Line: ${line}

Code context:
\`\`\`${language}
${context}
\`\`\`

Provide:
1. Root cause analysis
2. Specific fix for the error
3. Explanation of the solution
4. Prevention suggestions

Format as JSON:
{
  "diagnosis": "root cause explanation",
  "fix": "specific code fix",
  "explanation": "why this fixes the issue",
  "prevention": "how to prevent similar issues"
}`;

    const response = await this.queryGrok(prompt);
    return response;
  }

  /**
   * Smart refactoring suggestions
   */
  async suggestSmartRefactoring(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const language = this.getLanguageFromFile(filePath);
    
    const analysis = await grokAnalyzer.analyzeFile(filePath);
    const refactorings = await grokAnalyzer.suggestRefactoring(content, language);
    
    // Prioritize refactorings by impact
    const prioritized = refactorings.refactorings.sort((a, b) => {
      const impactOrder = { high: 3, medium: 2, low: 1 };
      return impactOrder[b.impact] - impactOrder[a.impact];
    });
    
    return {
      currentScore: analysis.score,
      refactorings: prioritized,
      estimatedImprovement: this.calculateRefactoringImpact(prioritized)
    };
  }

  /**
   * Generate comprehensive code documentation
   */
  async generateSmartDocumentation(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const language = this.getLanguageFromFile(filePath);
    
    const documentation = await grokAnalyzer.generateDocumentation(content, language);
    
    return {
      documented: documentation.documentation,
      api: documentation.apiDocs,
      examples: documentation.examples,
      coverage: this.calculateDocumentationCoverage(content, documentation.documentation)
    };
  }

  /**
   * Performance optimization suggestions
   */
  async suggestPerformanceOptimizations(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const language = this.getLanguageFromFile(filePath);
    
    const prompt = `Analyze this ${language} code for performance optimization opportunities:

\`\`\`${language}
${content}
\`\`\`

Focus on:
1. Database query optimization
2. Memory usage improvements
3. Async/await optimizations
4. Caching opportunities
5. Bundle size reduction
6. Runtime performance

Format as JSON:
{
  "optimizations": [
    {
      "type": "database",
      "issue": "N+1 query problem",
      "solution": "Use batch loading",
      "impact": "high",
      "before": "original code",
      "after": "optimized code"
    }
  ],
  "metrics": {
    "estimatedSpeedup": "2x faster",
    "memoryReduction": "30% less memory",
    "bundleSize": "15% smaller"
  }
}`;

    const response = await this.queryGrok(prompt);
    return response;
  }

  /**
   * Security vulnerability detection
   */
  async detectSecurityIssues(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const language = this.getLanguageFromFile(filePath);
    
    const prompt = `Perform security analysis on this ${language} code:

\`\`\`${language}
${content}
\`\`\`

Identify:
1. SQL injection vulnerabilities
2. XSS vulnerabilities
3. Authentication bypasses
4. Input validation issues
5. Sensitive data exposure
6. CSRF vulnerabilities

Format as JSON:
{
  "vulnerabilities": [
    {
      "type": "sql_injection",
      "severity": "high",
      "line": 25,
      "description": "User input not sanitized",
      "exploit": "how it can be exploited",
      "fix": "secure code implementation",
      "cwe": "CWE-89"
    }
  ],
  "recommendations": ["security best practices"]
}`;

    const response = await this.queryGrok(prompt);
    return response;
  }

  /**
   * Code quality metrics and improvements
   */
  async getCodeQualityMetrics(filePath) {
    const analysis = await grokAnalyzer.analyzeFile(filePath);
    
    const metrics = {
      overall: analysis.score,
      maintainability: analysis.maintainability,
      issues: {
        total: analysis.issues.length,
        high: analysis.issues.filter(i => i.severity === 'high').length,
        medium: analysis.issues.filter(i => i.severity === 'medium').length,
        low: analysis.issues.filter(i => i.severity === 'low').length
      },
      categories: {
        syntax: analysis.issues.filter(i => i.category === 'syntax').length,
        logic: analysis.issues.filter(i => i.category === 'logic').length,
        performance: analysis.issues.filter(i => i.category === 'performance').length,
        security: analysis.issues.filter(i => i.category === 'security').length,
        style: analysis.issues.filter(i => i.category === 'style').length
      }
    };
    
    return metrics;
  }

  /**
   * Real-time code improvement suggestions
   */
  async getRealtimeImprovement(filePath, changes) {
    const content = fs.readFileSync(filePath, 'utf8');
    const language = this.getLanguageFromFile(filePath);
    
    const prompt = `Provide real-time improvement suggestions for this ${language} code change:

Original:
\`\`\`${language}
${changes.before}
\`\`\`

Modified:
\`\`\`${language}
${changes.after}
\`\`\`

Provide:
1. Immediate feedback on the change
2. Potential issues introduced
3. Optimization suggestions
4. Best practice recommendations

Format as JSON:
{
  "feedback": "immediate feedback",
  "issues": ["potential issues"],
  "optimizations": ["optimization suggestions"],
  "bestPractices": ["best practice recommendations"]
}`;

    const response = await this.queryGrok(prompt);
    return response;
  }

  // Helper methods
  async queryGrok(prompt) {
    try {
      const response = await grokAnalyzer.grok.chat.completions.create({
        model: "grok-2-1212",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.3,
      });
      
      return JSON.parse(response.choices[0].message.content || '{}');
    } catch (error) {
      console.error('Grok query error:', error);
      return {};
    }
  }

  getLanguageFromFile(filepath) {
    const ext = path.extname(filepath);
    const langMap = {
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.js': 'javascript',
      '.jsx': 'javascript'
    };
    return langMap[ext] || 'javascript';
  }

  calculateRefactoringImpact(refactorings) {
    const highImpact = refactorings.filter(r => r.impact === 'high').length;
    const mediumImpact = refactorings.filter(r => r.impact === 'medium').length;
    const lowImpact = refactorings.filter(r => r.impact === 'low').length;
    
    return {
      totalRefactorings: refactorings.length,
      highImpact,
      mediumImpact,
      lowImpact,
      estimatedScoreIncrease: highImpact * 10 + mediumImpact * 5 + lowImpact * 2
    };
  }

  calculateDocumentationCoverage(original, documented) {
    const originalLines = original.split('\n').length;
    const documentedLines = documented.split('\n').length;
    const coverageIncrease = documentedLines - originalLines;
    
    return {
      originalLines,
      documentedLines,
      coverageIncrease,
      coveragePercentage: Math.round((coverageIncrease / originalLines) * 100)
    };
  }
}

// CLI interface for development use
async function main() {
  const assistant = new CursorStyleAssistant();
  const command = process.argv[2];
  const filePath = process.argv[3];
  
  if (!command || !filePath) {
    console.log(`
Usage: node cursor-style-improvements.js <command> <file>

Commands:
  analyze <file>           - Analyze file for improvements
  refactor <file>         - Get refactoring suggestions
  security <file>         - Check for security issues
  performance <file>      - Get performance optimizations
  docs <file>            - Generate documentation
  quality <file>         - Get code quality metrics
  
Examples:
  node cursor-style-improvements.js analyze server/routes.ts
  node cursor-style-improvements.js refactor client/src/App.tsx
  node cursor-style-improvements.js security server/services/meshy-ai-service.ts
    `);
    return;
  }
  
  try {
    switch (command) {
      case 'analyze':
        const improvements = await assistant.suggestSmartRefactoring(filePath);
        console.log(JSON.stringify(improvements, null, 2));
        break;
        
      case 'refactor':
        const refactorings = await assistant.suggestSmartRefactoring(filePath);
        console.log(JSON.stringify(refactorings, null, 2));
        break;
        
      case 'security':
        const security = await assistant.detectSecurityIssues(filePath);
        console.log(JSON.stringify(security, null, 2));
        break;
        
      case 'performance':
        const performance = await assistant.suggestPerformanceOptimizations(filePath);
        console.log(JSON.stringify(performance, null, 2));
        break;
        
      case 'docs':
        const docs = await assistant.generateSmartDocumentation(filePath);
        console.log(JSON.stringify(docs, null, 2));
        break;
        
      case 'quality':
        const quality = await assistant.getCodeQualityMetrics(filePath);
        console.log(JSON.stringify(quality, null, 2));
        break;
        
      default:
        console.log(`Unknown command: ${command}`);
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { CursorStyleAssistant };