/**
 * Script para garantir persistência de sessão entre recarregamentos
 * e evitar flash da tela de login
 */
(function() {
  // Verificar parâmetro de logout para prevenir flash da interface principal
  if (window.location.search.includes('logout=')) {
    // Impedir que a interface principal seja mostrada ao recarregar após logout
    document.write('<style id="force-login">#app-content{display:none !important;} #auth-container{display:flex !important;}</style>');
    console.log('[SessionPersistence] Forçando tela de login por parâmetro de logout');
  }
  
  document.addEventListener('DOMContentLoaded', () => {
    // Verificar o estado de autenticação periodicamente para manter a persistência
    const checkAuthState = setInterval(() => {
      if (window.authManager && window.authManager.isAuthenticated()) {
        // Quando confirmamos que estamos autenticados, atualizamos o estado de sessão
        localStorage.setItem('auth_session_active', 'true');
        
        // Também verificar se temos o perfil de usuário em sessionStorage
        if (!sessionStorage.getItem('userProfile') && window.authManager.userProfile) {
          sessionStorage.setItem('userProfile', JSON.stringify(window.authManager.userProfile));
          console.log('[SessionPersistence] Perfil de usuário armazenado em sessionStorage');
        }
        
        clearInterval(checkAuthState);
      } else {
        // NOVO: Se não estiver autenticado mas tiver a flag de sessão ativa, limpá-la
        if (localStorage.getItem('auth_session_active') === 'true') {
          console.log('[SessionPersistence] Estado inconsistente detectado: Flag de sessão ativa mas usuário não autenticado');
          localStorage.removeItem('auth_session_active');
          sessionStorage.removeItem('userProfile');
          
          // Forçar reconexão à tela de login após um breve delay
          setTimeout(() => {
            if (window.loginManager) {
              window.loginManager.showAuthContainer();
            } else {
              location.reload();
            }
          }, 500);
        }
      }
    }, 1000);
    
    // Limpar flag de sessão quando detectamos logout
    if (window.location.search.includes('logout=')) {
      localStorage.removeItem('auth_session_active');
      console.log('[SessionPersistence] Flag de sessão removida após logout');
    }
    
    // Adicionar verificação imediata para recuperar perfil do localStorage quando necessário
    setTimeout(() => {
      if (window.authManager && window.authManager.currentUser && !window.authManager.userProfile) {
        const userId = window.authManager.currentUser.id;
        console.log('[SessionPersistence] Tentando recuperar perfil de localStorage para', userId);
        
        try {
          const savedProfile = localStorage.getItem('user_profile_' + userId);
          if (savedProfile) {
            const profileData = JSON.parse(savedProfile);
            window.authManager.userProfile = profileData;
            window.authManager.privilegeLevel = profileData.privilege_level;
            
            // Salvar em sessionStorage para outros componentes usarem
            sessionStorage.setItem('userProfile', savedProfile);
            
            console.log('[SessionPersistence] Perfil recuperado do localStorage:', profileData.full_name);
            
            // Atualizar a interface se necessário
            if (typeof forceShowMainInterface === 'function') {
              forceShowMainInterface();
            }
          }
        } catch (e) {
          console.error('[SessionPersistence] Erro ao recuperar perfil do localStorage:', e);
        }
      }
    }, 1000); // 1 segundo de delay para garantir que o authManager já tenha sido inicializado
  });
  
  // Verificar flag de sessão ao recarregar a página
  window.addEventListener('beforeunload', () => {
    if (window.authManager && window.authManager.isAuthenticated()) {
      localStorage.setItem('auth_session_active', 'true');
    }
  });
  
  // CORREÇÃO: Verificar mais rigorosamente a validade da sessão salva
  if (!window.hasExistingSession) {
    try {
      if (localStorage.getItem('auth_session_active') === 'true' && sessionStorage.getItem('userProfile')) {
        // Verificar se o perfil parece válido
        const profile = JSON.parse(sessionStorage.getItem('userProfile'));
        if (profile && profile.id) {
          window.hasExistingSession = true;
          console.log('[SessionPersistence] Sessão ativa válida detectada via flag persistente');
          document.write('<style id="prevent-auth-flash">#auth-container{display:none !important;}</style>');
        } else {
          // Perfil inválido, remover flags
          localStorage.removeItem('auth_session_active');
          sessionStorage.removeItem('userProfile');
          console.log('[SessionPersistence] Perfil inválido encontrado, sessão ignorada');
        }
      }
    } catch(e) {
      console.error('[SessionPersistence] Erro ao validar sessão:', e);
      localStorage.removeItem('auth_session_active');
      sessionStorage.removeItem('userProfile');
    }
  }
})();