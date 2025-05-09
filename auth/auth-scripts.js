// Função de verificação imediata de sessão
(function() {
  // Flag global para indicar estado de sessão
  window.hasExistingSession = false;
  
  // 1. Verificar sessionStorage primeiro (mais rápido)
  if (sessionStorage.getItem('userProfile')) {
    document.write('<style id="prevent-auth-flash">#auth-container{display:none !important;}</style>');
    window.hasExistingSession = true;
    console.log('[FastAuth] Sessão detectada em sessionStorage');
  }
  // 2. Verificar também localStorage para tokens do Supabase
  else {
    try {
      const hasToken = Object.keys(localStorage).some(key => 
        key.includes('supabase') || key.includes('sb-')
      );
      
      if (hasToken) {
        document.write('<style id="prevent-auth-flash">#auth-container{display:none !important;}</style>');
        window.hasExistingSession = true;
        console.log('[FastAuth] Token Supabase detectado em localStorage');
      }
    } catch (e) {
      console.error('[FastAuth] Erro ao verificar localStorage:', e);
    }
  }
  
  // 3. Adicionar flag de sessão no localStorage para persistência entre recarregamentos
  if (window.hasExistingSession) {
    try {
      localStorage.setItem('auth_session_active', 'true');
    } catch(e) {}
  }
})();

// Verificar se estamos em um processo de logout
(function() {
  const isLoggingOut = sessionStorage.getItem('logging_out') === 'true';
  
  if (isLoggingOut) {
    console.log('Processo de logout detectado, limpando dados...');
    // Limpar localStorage de tokens Supabase
    Object.keys(localStorage).forEach(key => {
      if (key.includes('supabase') || key.includes('sb-')) {
        localStorage.removeItem(key);
      }
    });
    
    // Limpar sessionStorage
    sessionStorage.clear();
    
    console.log('Dados limpos com sucesso!');
  }
})();

// Função para formatar o nível de privilégio
function formatPrivilegeLevel(level) {
  const privilegeNames = {
    'master admin': 'Admin Master',
    'admin': 'Admin',
    'user': 'Usuário',
    'common user': 'Usuário Comum'
  };
  return privilegeNames[level] || level;
}

// Função para forçar exibição da interface principal
function forceShowMainInterface() {
  console.log('[Interface] Iniciando exibição forçada da interface principal');
  
  // Ocultar o container de login
  const authContainer = document.getElementById('auth-container');
  if (authContainer) {
    authContainer.style.display = 'none';
  }
  
  // Mostrar e restaurar o conteúdo principal
  const appContent = document.getElementById('app-content');
  if (appContent) {
    appContent.style.display = 'block';
    appContent.style.opacity = '1';
    appContent.style.pointerEvents = 'auto';
    
    Array.from(appContent.children).forEach(element => {
      element.style.opacity = '1';
      element.style.pointerEvents = 'auto';
      element.style.display = 'block';
    });
  }
  
  // Mostrar botão de logout
  const logoutButton = document.getElementById('logout-button');
  if (logoutButton) {
    logoutButton.style.display = 'block';
    console.log('[Interface] Botão de logout exibido');
  }
  
  // Atualizar informações do usuário
  updateUserInfo();
  
  console.log('[Interface] Interface principal exibida com sucesso');
}

// Função para atualizar informações do usuário
function updateUserInfo() {
  const userInfoContainer = document.getElementById('user-info-container');
  if (!userInfoContainer) return;
  
  userInfoContainer.style.display = 'block';
  console.log('[Interface] Container de informações do usuário exibido');
  
  // Tentar obter informações do usuário
  let userProfile = null;
  
  try {
    // Verificar primeiro no authManager
    if (window.authManager && window.authManager.userProfile) {
      userProfile = window.authManager.userProfile;
    } 
    // Verificar na sessão
    else {
      const storedProfile = sessionStorage.getItem('userProfile');
      if (storedProfile) {
        userProfile = JSON.parse(storedProfile);
      } 
      // Se ainda não encontrado, verificar no localStorage
      else if (window.authManager && window.authManager.currentUser) {
        const userId = window.authManager.currentUser.id;
        const localProfile = localStorage.getItem('user_profile_' + userId);
        if (localProfile) {
          userProfile = JSON.parse(localProfile);
          // Sincronizar de volta com o sessionStorage
          sessionStorage.setItem('userProfile', localProfile);
        }
        // Se ainda não temos o perfil, solicitar ao authManager para buscá-lo
        else if (window.authManager.fetchUserProfile) {
          // Iniciar busca assíncrona do perfil
          window.authManager.fetchUserProfile().then(profile => {
            if (profile && userInfoContainer) {
              userInfoContainer.innerHTML = `
                <div style="font-weight: bold;">${profile.full_name || 'Usuário'}</div>
                <div style="font-size: 10px; opacity: 0.8; margin-top: 3px;">${formatPrivilegeLevel(profile.privilege_level || 'user')}</div>
              `;
            }
          });
        }
      }
    }
    
    if (userProfile) {
      userInfoContainer.innerHTML = `
        <div style="font-weight: bold;">${userProfile.full_name || 'Usuário'}</div>
        <div style="font-size: 10px; opacity: 0.8; margin-top: 3px;">${formatPrivilegeLevel(userProfile.privilege_level || 'user')}</div>
      `;
      console.log('[Interface] Informações do usuário atualizadas:', userProfile.full_name);
    } else {
      userInfoContainer.innerHTML = `<div>Carregando...</div>`;
      console.log('[Interface] Buscando informações do perfil...');
    }
  } catch (error) {
    console.error('[Interface] Erro ao exibir informações do usuário:', error);
    userInfoContainer.innerHTML = `<div>Usuário</div>`;
  }
}

// Inicializar eventos quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  // Configurar botão de logout
  initLogoutButton();
  
  // Configurar diagnóstico de autenticação
  initAuthDiagnostic();
  
  // Configurar sistema de recuperação
  initRecoverySystem();
});

// Inicialização do botão de logout
function initLogoutButton() {
  const logoutButton = document.getElementById('logout-button');
  if (!logoutButton) return;
  
  // Verificar periodicamente se o usuário está autenticado (como backup)
  const authCheckInterval = setInterval(() => {
    if (window.authManager && window.authManager.isAuthenticated()) {
      forceShowMainInterface();
      clearInterval(authCheckInterval);
    }
  }, 1000);
  
  // Verificar se authManager está disponível
  const checkAuthManager = setInterval(() => {
    if (window.authManager && window.authManager.supabase) {
      clearInterval(checkAuthManager);
      
      // Configurar listener de autenticação
      window.authManager.onAuthStateChanged((isAuthenticated) => {
        if (isAuthenticated) {
          forceShowMainInterface();
        }
      });
      
      // Adicionar evento de logout
      logoutButton.addEventListener('click', handleLogout);
    }
  }, 200);
}

// Função de manipulação do logout
async function handleLogout() {
  if (confirm('Tem certeza que deseja sair?')) {
    try {
      // Mostrar tela de login IMEDIATAMENTE
      const authContainer = document.getElementById('auth-container');
      if (authContainer) {
        authContainer.style.display = 'flex';
        
        // Animar a entrada do container
        requestAnimationFrame(() => {
          authContainer.classList.add('visible');
        });
      }
      
      // Esconder interface principal imediatamente
      const appContent = document.getElementById('app-content');
      if (appContent) appContent.style.display = 'none';
      
      // Desabilitar o botão
      const logoutButton = document.getElementById('logout-button');
      logoutButton.style.opacity = '0.5';
      logoutButton.style.pointerEvents = 'none';
      logoutButton.textContent = 'Saindo...';
      
      // Executar o logout em segundo plano
      (async () => {
        // Limpar dados de sessão
        sessionStorage.clear();
        localStorage.removeItem('auth_session_active');
        
        // Limpar tokens do Supabase
        Object.keys(localStorage).forEach(key => {
          if (key && (key.includes('supabase') || key.includes('sb-'))) {
            localStorage.removeItem(key);
          }
        });
        
        // Chamar API de logout
        if (window.authManager) {
          window.authManager.signOut().catch(err => {
            console.error('Erro na API signOut:', err);
          });
        }
        
        // Recarregar a página após breve delay
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      })();
    } catch (error) {
      console.error('Erro durante logout:', error);
      window.location.reload();
    }
  }
}

// Inicialização do diagnóstico de autenticação
function initAuthDiagnostic() {
  // Adicione um contador para parar após algumas verificações
  let checkCount = 0;
  const maxChecks = 3; // Número máximo de verificações
  
  // Verificar estado a cada 5 segundos para diagnóstico
  const loginDiagnosticInterval = setInterval(() => {
    if (window.authManager) {
      console.log('Diagnóstico de autenticação:', {
        authManagerLoaded: true,
        supabaseInitialized: !!window.authManager.supabase,
        userAuthenticated: window.authManager.isAuthenticated(),
        currentUser: window.authManager.currentUser ? window.authManager.currentUser.email : null,
        hasUserProfile: !!window.authManager.userProfile
      });
      
      checkCount++;
      
      // Parar após o número máximo de verificações OU se autenticado
      if (window.authManager.isAuthenticated() || checkCount >= maxChecks) {
        clearInterval(loginDiagnosticInterval);
        
        // Se autenticado, mostrar interface principal
        if (window.authManager.isAuthenticated()) {
          setTimeout(forceShowMainInterface, 500);
        }
      }
    }
  }, 5000);
}

// A função pode ser removida ou comentada 
/*
function initEmergencyBypass() {
  const emergencyBypass = document.getElementById('emergency-login-bypass');
  
  // Iniciar invisível mas já no DOM
  if (emergencyBypass) {
    emergencyBypass.style.opacity = '0';
    emergencyBypass.style.display = 'block';
    
    // Verificar se é necessário mostrar o botão
    const needsEmergencyButton = () => {
      const authContainer = document.getElementById('auth-container');
      return authContainer && authContainer.style.display !== 'none';
    };
    
    // Usando requestIdleCallback para não bloquear renderização
    if (window.requestIdleCallback) {
      requestIdleCallback(() => {
        setTimeout(() => {
          if (needsEmergencyButton()) {
            // Mostrar com fade in em vez de display block imediato
            emergencyBypass.style.transition = 'opacity 0.3s';
            emergencyBypass.style.opacity = '1';
          }
        }, 3000);
      });
    } else {
      // Fallback para navegadores que não suportam requestIdleCallback
      setTimeout(() => {
        if (needsEmergencyButton()) {
          emergencyBypass.style.opacity = '1';
        }
      }, 3000);
    }
    
    // Configurar evento de clique
    emergencyBypass.addEventListener('click', () => {
      const basicProfile = {
        id: 'emergency-session',
        email: 'emergency@access.local',
        full_name: 'Acesso Emergencial',
        privilege_level: 'master admin'
      };
      
      sessionStorage.setItem('userProfile', JSON.stringify(basicProfile));
      forceShowMainInterface();
      emergencyBypass.style.display = 'none';
    });
  }
}
*/

// Inicialização do sistema de recuperação
function initRecoverySystem() {
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
}