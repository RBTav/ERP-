/**
 * Monitor de performance para interações de UI
 */
class PerformanceMonitor {
  constructor() {
    this.isEnabled = false;
    this.interactions = {};
  }
  
  enable() {
    this.isEnabled = true;
    this.setupInteractionObserver();
  }
  
  disable() {
    this.isEnabled = false;
  }
  
  setupInteractionObserver() {
    // Verifica se a API PerformanceObserver existe
    if (!('PerformanceObserver' in window)) return;
    
    try {
      // Observador para métricas de interação
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'event') {
            this.logInteraction(entry);
          }
        }
      });
      
      // Observar eventos de interação
      observer.observe({ type: 'event', buffered: true });
      
      console.log('Performance monitoring enabled');
    } catch (e) {
      console.error('Failed to initialize performance monitoring:', e);
    }
  }
  
  logInteraction(entry) {
    const target = entry.target || 'unknown';
    const targetType = target.tagName ? target.tagName.toLowerCase() : 'unknown';
    const duration = entry.duration;
    
    // Registrar métricas
    if (!this.interactions[targetType]) {
      this.interactions[targetType] = {
        count: 0,
        totalDuration: 0,
        min: Infinity,
        max: 0
      };
    }
    
    const stats = this.interactions[targetType];
    stats.count++;
    stats.totalDuration += duration;
    stats.min = Math.min(stats.min, duration);
    stats.max = Math.max(stats.max, duration);
    
    // Alertar para problemas de performance
    if (duration > 100) {
      console.warn(`Slow interaction on ${targetType}: ${Math.round(duration)}ms`);
      
      if (target.className && target.className.includes('control-button')) {
        console.warn('Consider optimizing control button interactions');
      }
    }
  }
  
  getReport() {
    if (!this.isEnabled) return 'Performance monitoring is disabled';
    
    let report = '=== Performance Report ===\n';
    
    for (const [type, stats] of Object.entries(this.interactions)) {
      const avg = stats.totalDuration / stats.count;
      report += `${type}: ${stats.count} interactions, avg: ${avg.toFixed(2)}ms, ` +
                `min: ${stats.min.toFixed(2)}ms, max: ${stats.max.toFixed(2)}ms\n`;
    }
    
    return report;
  }
}

// Criar instância global
window.performanceMonitor = new PerformanceMonitor();

// Ativar em produção apenas para uma pequena amostra de usuários
// ou ativar sempre em desenvolvimento
if (location.hostname === 'localhost' || Math.random() < 0.05) {
  document.addEventListener('DOMContentLoaded', () => {
    window.performanceMonitor.enable();
  });
}