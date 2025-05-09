/**
 * Sistema de Debug Configurável
 * Permite ativar/desativar logs de diferentes componentes
 */
class DebugManager {
  constructor() {
    // Configuração padrão de debug
    this.config = {
      enabled: false, // Debug desativado por padrão
      components: {
        positioning: true,  // Debug de posicionamento (top, left, etc)
        controls: true,     // Debug dos botões de controle
        imageProcess: true, // Debug de processamento de imagens
        events: true,      // Debug de eventos (click, drag, etc)
        performance: true  // Debug de performance
      },
      logToConsole: true,   // Mostrar logs no console
      logToUI: true        // Mostrar logs na interface
    };
    
    this.logHistory = [];
    this.init();
  }
  
  init() {
    // Tenta carregar configurações salvas
    const savedConfig = localStorage.getItem('profileImageDebug');
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        this.config = {...this.config, ...parsed};
      } catch (e) {
        console.error('Erro ao carregar configuração de debug:', e);
      }
    }
    
    // Adiciona atalho de teclado para toggle (Ctrl+Shift+D)
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'd') {
        this.toggleDebugPanel();
        e.preventDefault();
      }
    });
    
    // Se o modo debug estiver ativo, cria o painel
    if (this.config.enabled && this.config.logToUI) {
      this.createDebugPanel();
    }
  }
  
  log(component, message, data = null) {
    // Verifica se o componente está habilitado para debug
    if (!this.config.enabled || !this.config.components[component]) {
      return;
    }
    
    const timestamp = new Date().toISOString().substr(11, 8); // HH:MM:SS
    
    // Adiciona ao histórico
    this.logHistory.push({
      timestamp,
      component,
      message,
      data
    });
    
    // Limita o histórico a 100 entradas
    if (this.logHistory.length > 100) {
      this.logHistory.shift();
    }
    
    // Log no console
    if (this.config.logToConsole) {
      console.groupCollapsed(`[${timestamp}] [${component}] ${message}`);
      console.log(data || 'No data');
      console.groupEnd();
    }
    
    // Atualiza a UI se estiver ativa
    this.updateDebugPanel();
  }
  
  createDebugPanel() {
    // Remove painel existente, se houver
    this.removeDebugPanel();
    
    const panel = document.createElement('div');
    panel.id = 'debug-panel';
    panel.style.cssText = `
      position: fixed;
      bottom: 10px;
      right: 10px;
      width: 300px;
      max-height: 400px;
      background: rgba(0,0,0,0.8);
      color: white;
      border-radius: 5px;
      font-family: monospace;
      font-size: 12px;
      z-index: 10000;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    `;
    
    // Cabeçalho
    const header = document.createElement('div');
    header.style.cssText = `
      padding: 5px;
      background: #333;
      display: flex;
      justify-content: space-between;
      align-items: center;
    `;
    
    const title = document.createElement('div');
    title.textContent = 'Debug Panel';
    
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '&times;';
    closeBtn.style.cssText = `
      background: none;
      border: none;
      color: white;
      font-size: 16px;
      cursor: pointer;
    `;
    closeBtn.addEventListener('click', () => this.toggleDebugPanel());
    
    header.appendChild(title);
    header.appendChild(closeBtn);
    
    // Controls section
    const controls = document.createElement('div');
    controls.style.cssText = `
      padding: 5px;
      border-bottom: 1px solid #444;
    `;
    
    // Componentes checkboxes
    for (const component in this.config.components) {
      const label = document.createElement('label');
      label.style.cssText = `display: inline-block; margin-right: 8px; margin-bottom: 5px;`;
      
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = this.config.components[component];
      checkbox.addEventListener('change', () => {
        this.config.components[component] = checkbox.checked;
        this.saveConfig();
      });
      
      label.appendChild(checkbox);
      label.appendChild(document.createTextNode(` ${component}`));
      controls.appendChild(label);
    }
    
    // Botão para exportar configuração
    const exportBtn = document.createElement('button');
    exportBtn.textContent = 'Export Config';
    exportBtn.style.cssText = `margin: 5px 5px 5px 0; font-size: 10px;`;
    exportBtn.addEventListener('click', () => {
      const jsonConfig = JSON.stringify(this.config, null, 2);
      console.log('Debug Configuration:', jsonConfig);
      alert('Debug configuration exported to console');
    });
    controls.appendChild(exportBtn);
    
    // Logs section
    const logs = document.createElement('div');
    logs.id = 'debug-logs';
    logs.style.cssText = `
      flex: 1;
      overflow-y: auto;
      padding: 5px;
      font-size: 11px;
    `;
    
    panel.appendChild(header);
    panel.appendChild(controls);
    panel.appendChild(logs);
    
    document.body.appendChild(panel);
  }
  
  updateDebugPanel() {
    if (!this.config.logToUI || !this.config.enabled) return;
    
    const logsContainer = document.getElementById('debug-logs');
    if (!logsContainer) {
      if (this.config.logToUI) this.createDebugPanel();
      return;
    }
    
    // Limpa e preenche com os logs mais recentes
    logsContainer.innerHTML = '';
    
    this.logHistory.slice(-15).forEach(entry => {
      const logEntry = document.createElement('div');
      logEntry.style.cssText = `
        margin-bottom: 4px;
        border-bottom: 1px solid #333;
        padding-bottom: 4px;
      `;
      
      const header = document.createElement('div');
      header.style.color = this.getComponentColor(entry.component);
      header.textContent = `[${entry.timestamp}] [${entry.component}] ${entry.message}`;
      
      logEntry.appendChild(header);
      
      if (entry.data) {
        const data = document.createElement('div');
        data.style.cssText = `
          padding-left: 10px;
          color: #aaa;
          font-size: 10px;
          white-space: pre-wrap;
          margin-top: 3px;
        `;
        data.textContent = typeof entry.data === 'object' 
          ? JSON.stringify(entry.data, null, 2)
          : String(entry.data);
        
        logEntry.appendChild(data);
      }
      
      logsContainer.appendChild(logEntry);
    });
    
    // Auto-scroll para o último log
    logsContainer.scrollTop = logsContainer.scrollHeight;
  }
  
  getComponentColor(component) {
    const colors = {
      positioning: '#4caf50',
      controls: '#2196f3',
      imageProcess: '#ff9800',
      events: '#9c27b0',
      performance: '#f44336'
    };
    
    return colors[component] || '#ffffff';
  }
  
  removeDebugPanel() {
    const panel = document.getElementById('debug-panel');
    if (panel) {
      panel.parentNode.removeChild(panel);
    }
  }
  
  toggleDebugPanel() {
    if (!this.config.enabled) {
      this.config.enabled = true;
      this.config.logToUI = true;
      this.createDebugPanel();
    } else {
      const panel = document.getElementById('debug-panel');
      if (panel) {
        this.removeDebugPanel();
        this.config.logToUI = false;
      } else {
        this.config.logToUI = true;
        this.createDebugPanel();
      }
    }
    
    this.saveConfig();
  }
  
  saveConfig() {
    try {
      localStorage.setItem('profileImageDebug', JSON.stringify(this.config));
    } catch (e) {
      console.error('Erro ao salvar configuração de debug:', e);
    }
  }
  
  // Método para definir config por JSON
  setConfig(jsonConfig) {
    try {
      const config = typeof jsonConfig === 'string' 
        ? JSON.parse(jsonConfig) 
        : jsonConfig;
        
      this.config = {...this.config, ...config};
      this.saveConfig();
      
      if (this.config.enabled && this.config.logToUI) {
        this.createDebugPanel();
      } else {
        this.removeDebugPanel();
      }
      
      return true;
    } catch (e) {
      console.error('Erro ao aplicar configuração:', e);
      return false;
    }
  }
}

// Cria a instância global
window.debugManager = new DebugManager();