/**
 * Módulo de autenticação e login
 * Este arquivo centraliza a inicialização do sistema de autenticação
 */

// Exportar componentes para uso em outros módulos
window.AuthModule = {
  init() {
    console.log('Inicializando módulo de autenticação...');
    
    // Verificar se os objetos já foram criados
    if (!window.authManager) {
      console.warn('AuthManager não encontrado, possível erro de carregamento');
    }
    
    if (!window.loginManager) {
      console.warn('LoginManager não encontrado, possível erro de carregamento');
    }
    
    return {
      authManager: window.authManager,
      loginManager: window.loginManager
    };
  },
  
  isAuthenticated() {
    return window.authManager && window.authManager.isAuthenticated();
  },
  
  getCurrentUser() {
    return window.authManager && window.authManager.getCurrentUser();
  },
  
  getUserProfile() {
    return window.authManager && window.authManager.getUserProfile();
  }
};