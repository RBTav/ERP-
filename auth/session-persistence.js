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
    // Adicionar verificação para ajustar a posição do container de informações do usuário
    const fixUserInfoPosition = () => {
      const userInfoContainer = document.getElementById('user-info-container');
      if (!userInfoContainer) return;
      
      // Detectar tamanho da tela
      const isMobile = window.innerWidth <= 480;
      const isTablet = window.innerWidth > 480 && window.innerWidth <= 768;
      
      // Aplicar posicionamento apropriado
      if (isMobile) {
        userInfoContainer.style.bottom = '110px';
        userInfoContainer.style.left = '-5px';
        userInfoContainer.style.fontSize = '14px';
        userInfoContainer.style.padding = '8px';
        console.log('[SessionPersistence] Ajustando posição para celular');
      } else if (isTablet) {
        userInfoContainer.style.bottom = '100px';
        userInfoContainer.style.left = '-5px';
        userInfoContainer.style.fontSize = '10px';
        userInfoContainer.style.padding = '5px';
        console.log('[SessionPersistence] Ajustando posição para tablet');
      } else {
        // Desktop
        userInfoContainer.style.bottom = '60px';
        userInfoContainer.style.left = '-11px'; // Valor ajustado para PC
        userInfoContainer.style.fontSize = '12px';
        userInfoContainer.style.padding = '8px';
        console.log('[SessionPersistence] Ajustando posição para desktop');
      }
    };
    
    // Executar imediatamente e depois periodicamente até ter sucesso
    const checkInterval = setInterval(() => {
      const userInfoContainer = document.getElementById('user-info-container');
      if (userInfoContainer && userInfoContainer.style.display !== 'none') {
        fixUserInfoPosition();
        clearInterval(checkInterval);
      }
    }, 500);

    // Também executar quando a janela for redimensionada
    window.addEventListener('resize', fixUserInfoPosition);

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

  // Adicionar listener de redimensionamento global para o container fixo
  document.addEventListener('DOMContentLoaded', () => {
    window.addEventListener('resize', () => {
      const userInfoContainer = document.getElementById('user-info-container');
      if (!userInfoContainer) return;
      
      // Aplicar estilos responsivos
      const isMobile = window.innerWidth <= 480;
      const isTablet = window.innerWidth > 480 && window.innerWidth <= 768;
      
      if (isMobile) {
        userInfoContainer.style.bottom = '110px';
        userInfoContainer.style.left = '-5px';
        userInfoContainer.style.fontSize = '14px';
        userInfoContainer.style.padding = '8px';
      } else if (isTablet) {
        userInfoContainer.style.bottom = '100px';
        userInfoContainer.style.left = '-5px';
        userInfoContainer.style.fontSize = '10px';
        userInfoContainer.style.padding = '5px';
      } else {
        userInfoContainer.style.bottom = '60px';
        userInfoContainer.style.left = '-11px';
        userInfoContainer.style.fontSize = '12px';
        userInfoContainer.style.padding = '8px';
      }
    });
  });
})();