#!/usr/bin/env node

/**
 * Development Code Analyzer
 * Cursor-style intelligent code analysis using Grok 4.0 for development improvements
 */

import { grokAnalyzer } from '../server/services/grok-code-analyzer.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
  // Files to analyze
  targetFiles: [
    'server/services/meshy-ai-service.ts',
    'server/services/image-character-analyzer.ts',
    'server/routes.ts',
    'client/src/App.tsx',
    'client/src/components/ProcessingLightbox.tsx',
    'shared/schema.ts'
  ],
  
  // Analysis focus areas
  focusAreas: [
    'performance',
    'security',
    'maintainability',
    'typescript_best_practices',
    'react_patterns',
    'async_improvements'
  ],
  
  // Output configuration
  outputDir: 'dev-analysis',
  generateReport: true,
  applyImprovements: false // Set to true when ready to apply changes
};

class DevCodeAnalyzer {
  constructor() {
    this.results = new Map();
    this.improvements = new Map();
    this.ensureOutputDir();
  }

  async analyzeProject() {
    console.log('🔍 Starting Grok 4.0 Development Code Analysis...');
    console.log('=' .repeat(60));

    // Analyze critical files
    for (const file of CONFIG.targetFiles) {
      if (fs.existsSync(file)) {
        console.log(`\n📄 Analyzing: ${file}`);
        try {
          const analysis = await grokAnalyzer.analyzeFile(file);
          this.results.set(file, analysis);
          
          // Generate improvements for critical files
          const code = fs.readFileSync(file, 'utf8');
          const language = this.getLanguageFromFile(file);
          const improvements = await grokAnalyzer.generateImprovements(code, language);
          this.improvements.set(file, improvements);
          
          console.log(`✅ Score: ${analysis.score}/100`);
          console.log(`⚠️  Issues: ${analysis.issues.length}`);
          console.log(`💡 Suggestions: ${analysis.suggestions.length}`);
          
        } catch (error) {
          console.error(`❌ Error analyzing ${file}:`, error.message);
        }
      } else {
        console.log(`⚠️  File not found: ${file}`);
      }
    }

    // Generate comprehensive report
    await this.generateAnalysisReport();
    
    // Show development recommendations
    this.showDevRecommendations();
  }

  async generateAnalysisReport() {
    const report = {
      timestamp: new Date().toISOString(),
      projectScore: this.calculateProjectScore(),
      files: {},
      topIssues: this.getTopIssues(),
      criticalSecurity: this.getCriticalSecurity(),
      performanceOpportunities: this.getPerformanceOpportunities(),
      developmentRecommendations: this.getDevelopmentRecommendations()
    };

    // Add file-specific analysis
    for (const [file, analysis] of this.results) {
      report.files[file] = {
        score: analysis.score,
        issues: analysis.issues,
        suggestions: analysis.suggestions,
        improvements: this.improvements.get(file)
      };
    }

    // Save report
    const reportPath = path.join(CONFIG.outputDir, 'development-analysis-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📊 Analysis report saved: ${reportPath}`);

    // Generate markdown summary
    await this.generateMarkdownReport(report);
  }

  async generateMarkdownReport(report) {
    const markdown = `# VIDA³ Development Code Analysis Report

Generated: ${new Date().toLocaleString()}

## Project Overview
- **Overall Score**: ${report.projectScore}/100
- **Files Analyzed**: ${Object.keys(report.files).length}
- **Critical Issues**: ${report.criticalSecurity.length}
- **Performance Opportunities**: ${report.performanceOpportunities.length}

## Top Issues to Address

${report.topIssues.map(issue => `- **${issue.severity.toUpperCase()}**: ${issue.message} (${issue.category})`).join('\n')}

## Critical Security Findings

${report.criticalSecurity.length > 0 ? 
  report.criticalSecurity.map(security => `- **${security.severity.toUpperCase()}**: ${security.vulnerability}\n  - ${security.description}\n  - **Fix**: ${security.fix}`).join('\n\n') : 
  'No critical security issues found.'}

## Performance Optimization Opportunities

${report.performanceOpportunities.map(perf => `- **${perf.metric}**: ${perf.current} → ${perf.optimized}\n  - **Improvement**: ${perf.improvement}\n  - **Technique**: ${perf.technique}`).join('\n\n')}

## Development Recommendations

${report.developmentRecommendations.map(rec => `- ${rec}`).join('\n')}

## File-Specific Analysis

${Object.entries(report.files).map(([file, data]) => `
### ${file}
- **Score**: ${data.score}/100
- **Issues**: ${data.issues.length}
- **Suggestions**: ${data.suggestions.length}

${data.improvements ? `
#### Suggested Improvements:
\`\`\`
${data.improvements.explanation}
\`\`\`
` : ''}
`).join('\n')}

---
*Generated by Grok 4.0 Development Analyzer*`;

    const markdownPath = path.join(CONFIG.outputDir, 'DEVELOPMENT_ANALYSIS.md');
    fs.writeFileSync(markdownPath, markdown);
    console.log(`📝 Markdown report saved: ${markdownPath}`);
  }

  showDevRecommendations() {
    console.log('\n🎯 Development Recommendations:');
    console.log('=' .repeat(40));
    
    const recommendations = this.getDevelopmentRecommendations();
    recommendations.forEach((rec, index) => {
      console.log(`${index + 1}. ${rec}`);
    });

    console.log('\n🔧 Next Steps:');
    console.log('1. Review generated analysis report');
    console.log('2. Address critical security issues first');
    console.log('3. Implement performance optimizations');
    console.log('4. Apply code improvements gradually');
    console.log('5. Set up automated code quality checks');
  }

  calculateProjectScore() {
    if (this.results.size === 0) return 0;
    
    const totalScore = Array.from(this.results.values())
      .reduce((sum, analysis) => sum + analysis.score, 0);
    
    return Math.round(totalScore / this.results.size);
  }

  getTopIssues() {
    const allIssues = Array.from(this.results.values())
      .flatMap(analysis => analysis.issues)
      .sort((a, b) => {
        const severityOrder = { high: 3, medium: 2, low: 1 };
        return severityOrder[b.severity] - severityOrder[a.severity];
      });
    
    return allIssues.slice(0, 10); // Top 10 issues
  }

  getCriticalSecurity() {
    return Array.from(this.results.values())
      .flatMap(analysis => analysis.security)
      .filter(issue => issue.severity === 'critical' || issue.severity === 'high');
  }

  getPerformanceOpportunities() {
    return Array.from(this.results.values())
      .flatMap(analysis => analysis.performance)
      .slice(0, 5); // Top 5 performance opportunities
  }

  getDevelopmentRecommendations() {
    const recommendations = [];
    
    // Based on analysis results
    const avgScore = this.calculateProjectScore();
    
    if (avgScore < 70) {
      recommendations.push('Focus on improving overall code quality through refactoring');
    }
    
    if (this.getCriticalSecurity().length > 0) {
      recommendations.push('Address security vulnerabilities immediately');
    }
    
    recommendations.push('Implement TypeScript strict mode for better type safety');
    recommendations.push('Add comprehensive error handling and logging');
    recommendations.push('Optimize database queries and API responses');
    recommendations.push('Implement caching strategies for better performance');
    recommendations.push('Add unit tests for critical functions');
    recommendations.push('Set up ESLint and Prettier for consistent code style');
    
    return recommendations;
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

  ensureOutputDir() {
    if (!fs.existsSync(CONFIG.outputDir)) {
      fs.mkdirSync(CONFIG.outputDir, { recursive: true });
    }
  }
}

// CLI Usage
async function main() {
  const analyzer = new DevCodeAnalyzer();
  
  try {
    await analyzer.analyzeProject();
    console.log('\n✅ Development analysis complete!');
  } catch (error) {
    console.error('❌ Analysis failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { DevCodeAnalyzer };