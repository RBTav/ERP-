/**
 * Script de recuperação emergencial para interfaces
 */
(function() {
  // Verificar após 3 segundos se alguma interface está visível
  setTimeout(() => {
    // Verificar estado do sistema
    const authContainer = document.getElementById('auth-container');
    const userInfoContainer = document.getElementById('user-info-container');
    const logoutButton = document.getElementById('logout-button');
    const appContent = document.getElementById('app-content');
    
    // Checar se estamos em um estado intermediário (nem login nem interface principal)
    const isLoginVisible = authContainer && (authContainer.style.display !== 'none');
    const isMainInterfaceActive = logoutButton && (logoutButton.style.display === 'block' || logoutButton.style.display === '');
    
    console.log('[Recovery] Verificando estado da interface:', {
      isLoginVisible,
      isMainInterfaceActive
    });
    
    if (!isLoginVisible && !isMainInterfaceActive) {
      console.warn('[Recovery] Estado inconsistente detectado: nenhuma interface visível');
      
      // Verificar se há sessão válida
      if (window.authManager && window.authManager.isAuthenticated()) {
        console.log('[Recovery] Usuário autenticado, forçando exibição da interface principal');
        if (typeof forceShowMainInterface === 'function') {
          forceShowMainInterface();
        }
      } else {
        console.log('[Recovery] Usuário não autenticado, forçando exibição do login');
        // Limpar quaisquer dados de sessão que possam estar causando o problema
        localStorage.removeItem('auth_session_active');
        sessionStorage.removeItem('userProfile');
        
        // Mostrar login
        if (window.loginManager) {
          // Reset completo do loginManager
          if (typeof LoginManager === 'function') {
            window.loginManager = new LoginManager();
          } else {
            window.loginManager.showAuthContainer();
          }
        } else {
          location.reload();
        }
      }
    }
  }, 3000);
})();