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
  
  // Função ÚNICA para ajustar posição do container de usuário - MODIFICADA PARA POSICIONAMENTO RELATIVO
  function adjustUserInfoContainer() {
    const userInfoContainer = document.getElementById('user-info-container');
    const userImageContainer = document.getElementById('user-image');
    
    if (!userInfoContainer || !userImageContainer) return;
    
    // Obter a posição e altura do círculo de imagem
    const imageRect = userImageContainer.getBoundingClientRect();
    const leftRectRect = document.getElementById('left-rectangle').getBoundingClientRect();
    
    // Detectar tamanho da tela
    const isMobile = window.innerWidth <= 480;
    const isTablet = window.innerWidth > 480 && window.innerWidth <= 768;
    
    // DISTÂNCIA ENTRE A IMAGEM E O CONTAINER DE INFORMAÇÕES (vertical)
    let distanceFromImage = 20; // Valor padrão para Desktop - AJUSTE ESTE VALOR
    
    // Ajustar distância vertical com base no dispositivo
    if (isMobile) {
      distanceFromImage = 15;
    } else if (isTablet) {
      distanceFromImage = 18;
    }
    
    // Calcular nova posição top: altura do elemento de imagem + distância desejada
    // A posição é relativa ao left-rectangle
    const newTop = (imageRect.bottom - leftRectRect.top) + distanceFromImage;
    
    // AJUSTES DE POSIÇÃO HORIZONTAL
    // Calcular o centro do retângulo lateral
    const leftRectCenter = leftRectRect.width / 2;
    
    // OFFSET HORIZONTAL (ajuste fino por dispositivo)
    let horizontalOffset = 0; // Valor padrão para Desktop - AJUSTE ESTE VALOR
    
    if (isMobile) {
      horizontalOffset = -5;
    } else if (isTablet) {
      horizontalOffset = -5;
    }
    
    // Aplicar posição calculada e outros estilos
    userInfoContainer.style.setProperty('position', 'absolute', 'important');
    userInfoContainer.style.setProperty('top', `${newTop}px`, 'important');
    userInfoContainer.style.setProperty('left', `${horizontalOffset}px`, 'important'); // Posição horizontal ajustada
    userInfoContainer.style.setProperty('width', '100%', 'important'); // Garantir que a largura seja consistente
    
    // Resto dos estilos específicos por dispositivo
    if (isMobile) {
      userInfoContainer.style.setProperty('font-size', '14px', 'important');
      userInfoContainer.style.setProperty('padding', '8px', 'important');
      console.log(`[SessionPersistence] Posição ajustada para celular: top=${newTop}px, left=${horizontalOffset}px`);
    } else if (isTablet) {
      userInfoContainer.style.setProperty('font-size', '10px', 'important');
      userInfoContainer.style.setProperty('padding', '5px', 'important');
      console.log(`[SessionPersistence] Posição ajustada para tablet: top=${newTop}px, left=${horizontalOffset}px`);
    } else {
      // Desktop
      userInfoContainer.style.setProperty('font-size', '12px', 'important');
      userInfoContainer.style.setProperty('padding', '8px', 'important');
      console.log(`[SessionPersistence] Posição ajustada para desktop: top=${newTop}px, left=${horizontalOffset}px`);
    }
  }
  
  document.addEventListener('DOMContentLoaded', () => {
    // Executar imediatamente e também após um delay para garantir
    adjustUserInfoContainer();
    
    // Aplicar novamente após um curto delay para garantir que funcione após a inicialização completa
    setTimeout(adjustUserInfoContainer, 500);
    
    // Aplicar uma terceira vez após interface completa estar carregada
    setTimeout(adjustUserInfoContainer, 2000);
    
    // MODIFICADO: Verificar algumas vezes e depois parar, em vez de verificar infinitamente
    let checkCount = 0;
    const maxChecks = 5; // Número máximo de verificações
    
    const checkInterval = setInterval(() => {
      const userInfoContainer = document.getElementById('user-info-container');
      if (userInfoContainer && userInfoContainer.style.display !== 'none') {
        adjustUserInfoContainer();
        checkCount++;
        
        // Limpar o intervalo após o número máximo de verificações
        if (checkCount >= maxChecks) {
          console.log('[SessionPersistence] Verificações de posição concluídas, monitoramento contínuo desativado');
          clearInterval(checkInterval);
        }
      }
    }, 1000);

    // Também executar quando a janela for redimensionada (isso continua funcionando)
    window.addEventListener('resize', adjustUserInfoContainer);

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