/**
 * Carregador dinâmico para os componentes de autenticação
 */
class AuthLoader {
  constructor() {
    this.loaded = false;
    this.authContainerLoaded = false;
  }
  
  // Carregar o container de autenticação
  async loadAuthContainer() {
    if (this.authContainerLoaded) return;
    
    try {
      console.log('[AuthLoader] Criando container de autenticação inline');
      
      // Criar o HTML diretamente em vez de fazer fetch
      const authContainerHTML = `
        <div id="auth-container" class="auth-container">
          <!-- O conteúdo será preenchido dinamicamente pelo login.js -->
        </div>
        
        <div id="emergency-login-bypass" style="position: fixed; bottom: 10px; right: 10px; background-color: #e74c3c; color: white; padding: 8px; border-radius: 4px; cursor: pointer; font-size: 12px; z-index: 100000; display: none; opacity: 0; will-change: opacity; contain: content;">
          Modo Emergência
        </div>
      `;
      
      // Criar um div temporário para converter a string em elementos DOM
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = authContainerHTML;
      
      // Inserir no body como primeiro elemento
      document.body.insertBefore(tempDiv.firstElementChild, document.body.firstChild);
      
      // Se houver mais elementos, adicioná-los também
      while (tempDiv.firstChild) {
        document.body.insertBefore(tempDiv.firstChild, document.getElementById('app-content'));
      }
      
      this.authContainerLoaded = true;
      console.log('[AuthLoader] Container de autenticação criado com sucesso');
    } catch (error) {
      console.error('[AuthLoader] Erro ao criar container de autenticação:', error);
    }
  }
  
  // Iniciar carregamento de todos os componentes
  async init() {
    if (this.loaded) return;
    
    try {
      // Carregar primeiro o container de autenticação
      await this.loadAuthContainer();
      
      this.loaded = true;
      console.log('[AuthLoader] Todos os componentes de autenticação carregados');
      
      // Disparar evento para notificar que a autenticação foi carregada
      document.dispatchEvent(new CustomEvent('auth-loaded'));
    } catch (error) {
      console.error('[AuthLoader] Erro ao inicializar componentes de autenticação:', error);
    }
  }
}

// Criar instância global e iniciar
window.authLoader = new AuthLoader();

// Carregar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  window.authLoader.init();
});