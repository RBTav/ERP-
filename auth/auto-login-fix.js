/**
 * Script de recuperação automática para problemas de autenticação
 */
(function() {
  // Verificar se o usuário já está autenticado a cada 2 segundos
  const checkInterval = setInterval(() => {
    // Verificar se temos um perfil salvo na sessão
    const hasProfile = !!sessionStorage.getItem('userProfile');
    
    // Verificar se o authManager indica que estamos autenticados
    const isAuthManagerAuthenticated = window.authManager && window.authManager.isAuthenticated();
    
    // Verificar se a tela de login ainda está visível
    const isLoginVisible = document.getElementById('auth-container') && 
                          document.getElementById('auth-container').style.display !== 'none';
    
    // Se estivermos autenticados mas a tela de login ainda estiver visível
    if ((hasProfile || isAuthManagerAuthenticated) && isLoginVisible) {
      console.warn('Detectado estado inconsistente: usuário autenticado mas tela de login visível');
      
      // Forçar exibição da interface principal
      if (window.forceShowMainInterface) {
        window.forceShowMainInterface();
        console.log('Interface forçada via script de recuperação');
        
        // Parar de verificar após resolver o problema
        clearInterval(checkInterval);
      }
    }
    
    // Parar de verificar após 30 segundos
    setTimeout(() => {
      clearInterval(checkInterval);
    }, 30000);
  }, 2000);
})();

// Adicione esta função no final do arquivo
(function checkLogoutState() {
  // Verificar a cada segundo se o usuário foi deslogado
  setInterval(() => {
    // Se temos um authManager, mas o usuário não está mais autenticado
    if (window.authManager && !window.authManager.isAuthenticated()) {
      // E se a tela de login não está visível
      const authContainer = document.getElementById('auth-container');
      if (authContainer && authContainer.style.display === 'none') {
        console.log('Detectado estado de logout, mostrando tela de login...');
        
        // Mostrar tela de login
        if (window.loginManager) {
          window.loginManager.showAuthContainer();
        }
        
        // Esconder elementos da interface principal
        const logoutButton = document.getElementById('logout-button');
        if (logoutButton) logoutButton.style.display = 'none';
        
        const userInfoContainer = document.getElementById('user-info-container');
        if (userInfoContainer) userInfoContainer.style.display = 'none';
      }
    }
  }, 1000);
})();